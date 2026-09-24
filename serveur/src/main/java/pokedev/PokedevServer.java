package pokedev;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/**
 * Serveur de comptes de Pokedev : inscription, connexion, suppression du compte et sauvegarde
 * de l'équipe et du PC, dans une base SQLite. Il n'écoute que sur localhost.
 *
 * <p>Les requêtes sont traitées une par une (exécuteur par défaut de HttpServer) : une seule
 * connexion SQLite suffit.
 */
public final class PokedevServer {

  private static final Pattern USERNAME = Pattern.compile("[A-Za-z0-9._-]{3,30}");
  private static final int MIN_PASSWORD = 8;
  private static final int MAX_PASSWORD = 128;
  private static final int MAX_FORM_BYTES = 1024;
  private static final int MAX_SAVE_BYTES = 256 * 1024;
  private static final Duration SESSION_LIFETIME = Duration.ofDays(7);
  /** Nombre d'itérations recommandé par l'OWASP pour PBKDF2-HMAC-SHA256. */
  private static final int PBKDF2_ITERATIONS = 600_000;

  private static final String[] SCHEMA = {
    "PRAGMA foreign_keys = ON",
    """
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      salt BLOB NOT NULL,
      password_hash BLOB NOT NULL)""",
    // Seule l'empreinte SHA-256 des jetons est conservée : une fuite de la base ne les révèle pas.
    """
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash BLOB PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL)""",
    // La sauvegarde est le fichier d'export de l'application, stocké tel quel.
    """
    CREATE TABLE IF NOT EXISTS saves (
      account_id INTEGER PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
      content TEXT NOT NULL)""",
  };

  private final HttpServer http;
  private final Connection db;
  private final SecureRandom random = new SecureRandom();

  private PokedevServer(HttpServer http, Connection db) {
    this.http = http;
    this.db = db;
  }

  public static void main(String[] args) throws Exception {
    int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
    String database = System.getenv().getOrDefault("DB_PATH", "pokedev.db");
    PokedevServer server = start(port, database);
    System.out.printf("Serveur Pokedev : http://localhost:%d/api (base %s)%n", server.port(), database);
  }

  /** Démarre le serveur ; le port 0 en choisit un libre, pratique pour les tests. */
  public static PokedevServer start(int port, String databasePath) throws IOException, SQLException {
    Connection db = DriverManager.getConnection("jdbc:sqlite:" + databasePath);
    try (Statement statement = db.createStatement()) {
      for (String sql : SCHEMA) {
        statement.execute(sql);
      }
    }
    InetSocketAddress address = new InetSocketAddress(InetAddress.getLoopbackAddress(), port);
    PokedevServer server = new PokedevServer(HttpServer.create(address, 0), db);
    server.http.createContext("/api/", server::handle);
    server.http.start();
    return server;
  }

  public int port() {
    return http.getAddress().getPort();
  }

  public void stop() throws SQLException {
    http.stop(0);
    db.close();
  }

  private void handle(HttpExchange exchange) throws IOException {
    try {
      switch (exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath()) {
        case "POST /api/accounts" -> register(exchange);
        case "DELETE /api/accounts/me" -> deleteAccount(exchange);
        case "POST /api/sessions" -> login(exchange);
        case "DELETE /api/sessions/current" -> logout(exchange);
        case "GET /api/accounts/me/save" -> readSave(exchange);
        case "PUT /api/accounts/me/save" -> writeSave(exchange);
        default -> throw new ApiException(404, "Ressource introuvable.");
      }
    } catch (ApiException e) {
      send(exchange, e.status, "text/plain", e.getMessage());
    } catch (Exception e) {
      e.printStackTrace();
      send(exchange, 500, "text/plain", "Erreur interne du serveur.");
    } finally {
      exchange.close();
    }
  }

  private void register(HttpExchange exchange) throws Exception {
    Map<String, String> form = readForm(exchange);
    String username = form.getOrDefault("username", "");
    String password = form.getOrDefault("password", "");
    if (!USERNAME.matcher(username).matches()) {
      throw new ApiException(400, "Identifiant invalide : 3 à 30 lettres, chiffres, points, tirets.");
    }
    if (password.length() < MIN_PASSWORD || password.length() > MAX_PASSWORD) {
      throw new ApiException(400, "Mot de passe invalide : 8 à 128 caractères.");
    }
    byte[] salt = randomBytes(16);
    int created =
        update(
            "INSERT INTO accounts (username, salt, password_hash) VALUES (?, ?, ?)"
                + " ON CONFLICT (username) DO NOTHING",
            username,
            salt,
            hash(password, salt));
    if (created == 0) {
      throw new ApiException(409, "Cet identifiant est déjà pris.");
    }
    send(exchange, 201, "text/plain", "Compte créé.");
  }

  private void login(HttpExchange exchange) throws Exception {
    Map<String, String> form = readForm(exchange);
    String password = form.getOrDefault("password", "");
    try (PreparedStatement select =
        db.prepareStatement("SELECT id, username, salt, password_hash FROM accounts WHERE username = ?")) {
      select.setString(1, form.getOrDefault("username", ""));
      try (ResultSet account = select.executeQuery()) {
        boolean valid =
            account.next()
                && password.length() >= MIN_PASSWORD
                && password.length() <= MAX_PASSWORD
                && MessageDigest.isEqual(
                    hash(password, account.getBytes("salt")), account.getBytes("password_hash"));
        if (!valid) {
          throw new ApiException(401, "Identifiant ou mot de passe incorrect.");
        }
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes(32));
        update("DELETE FROM sessions WHERE expires_at <= ?", now());
        update(
            "INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)",
            sha256(token),
            account.getLong("id"),
            now() + SESSION_LIFETIME.toSeconds());
        // Le jeton (base64url) et l'identifiant (validé à l'inscription) n'ont rien à échapper.
        String json = "{\"token\":\"%s\",\"username\":\"%s\"}";
        send(exchange, 200, "application/json", json.formatted(token, account.getString("username")));
      }
    }
  }

  private void logout(HttpExchange exchange) throws Exception {
    authenticate(exchange);
    update("DELETE FROM sessions WHERE token_hash = ?", sha256(bearerToken(exchange)));
    send(exchange, 204, null, "");
  }

  /** Supprime le compte ; ses sessions et sa sauvegarde partent avec lui (ON DELETE CASCADE). */
  private void deleteAccount(HttpExchange exchange) throws Exception {
    update("DELETE FROM accounts WHERE id = ?", authenticate(exchange));
    send(exchange, 204, null, "");
  }

  private void readSave(HttpExchange exchange) throws Exception {
    try (PreparedStatement select = db.prepareStatement("SELECT content FROM saves WHERE account_id = ?")) {
      select.setLong(1, authenticate(exchange));
      try (ResultSet save = select.executeQuery()) {
        if (!save.next()) {
          throw new ApiException(404, "Aucune sauvegarde pour ce compte.");
        }
        send(exchange, 200, "application/json", save.getString("content"));
      }
    }
  }

  private void writeSave(HttpExchange exchange) throws Exception {
    long accountId = authenticate(exchange);
    String content = new String(readBody(exchange, MAX_SAVE_BYTES), UTF_8);
    update(
        "INSERT INTO saves (account_id, content) VALUES (?, ?)"
            + " ON CONFLICT (account_id) DO UPDATE SET content = excluded.content",
        accountId,
        content);
    send(exchange, 204, null, "");
  }

  /** Compte correspondant au jeton « Authorization: Bearer … » de la requête. */
  private long authenticate(HttpExchange exchange) throws Exception {
    try (PreparedStatement select =
        db.prepareStatement("SELECT account_id FROM sessions WHERE token_hash = ? AND expires_at > ?")) {
      select.setBytes(1, sha256(bearerToken(exchange)));
      select.setLong(2, now());
      try (ResultSet session = select.executeQuery()) {
        if (!session.next()) {
          throw new ApiException(401, "Session inconnue ou expirée.");
        }
        return session.getLong("account_id");
      }
    }
  }

  private static String bearerToken(HttpExchange exchange) throws ApiException {
    String header = exchange.getRequestHeaders().getFirst("Authorization");
    if (header == null || !header.startsWith("Bearer ")) {
      throw new ApiException(401, "Authentification requise.");
    }
    return header.substring("Bearer ".length());
  }

  private int update(String sql, Object... parameters) throws SQLException {
    try (PreparedStatement statement = db.prepareStatement(sql)) {
      for (int i = 0; i < parameters.length; i++) {
        statement.setObject(i + 1, parameters[i]);
      }
      return statement.executeUpdate();
    }
  }

  private static Map<String, String> readForm(HttpExchange exchange) throws IOException, ApiException {
    Map<String, String> form = new HashMap<>();
    try {
      for (String pair : new String(readBody(exchange, MAX_FORM_BYTES), UTF_8).split("&")) {
        int equals = pair.indexOf('=');
        if (equals > 0) {
          form.put(
              URLDecoder.decode(pair.substring(0, equals), UTF_8),
              URLDecoder.decode(pair.substring(equals + 1), UTF_8));
        }
      }
    } catch (IllegalArgumentException e) {
      throw new ApiException(400, "Formulaire mal encodé.");
    }
    return form;
  }

  private static byte[] readBody(HttpExchange exchange, int limit) throws IOException, ApiException {
    byte[] body = exchange.getRequestBody().readNBytes(limit + 1);
    if (body.length > limit) {
      throw new ApiException(413, "Requête trop volumineuse.");
    }
    return body;
  }

  private static void send(HttpExchange exchange, int status, String type, String body)
      throws IOException {
    byte[] bytes = body.getBytes(UTF_8);
    if (type != null) {
      exchange.getResponseHeaders().set("Content-Type", type + "; charset=utf-8");
    }
    // -1 : réponse sans corps (204).
    exchange.sendResponseHeaders(status, bytes.length == 0 ? -1 : bytes.length);
    exchange.getResponseBody().write(bytes);
  }

  private static byte[] hash(String password, byte[] salt) throws GeneralSecurityException {
    PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, PBKDF2_ITERATIONS, 256);
    return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
  }

  private static byte[] sha256(String value) throws GeneralSecurityException {
    return MessageDigest.getInstance("SHA-256").digest(value.getBytes(UTF_8));
  }

  private byte[] randomBytes(int length) {
    byte[] bytes = new byte[length];
    random.nextBytes(bytes);
    return bytes;
  }

  private static long now() {
    return Instant.now().getEpochSecond();
  }

  /** Erreur renvoyée au client avec son code HTTP. */
  private static final class ApiException extends Exception {
    private final int status;

    ApiException(int status, String message) {
      super(message);
      this.status = status;
    }
  }
}
