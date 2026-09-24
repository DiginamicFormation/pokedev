package pokedev;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Teste l'API de bout en bout : un vrai serveur, une base SQLite temporaire. */
class PokedevServerTest {

  private static final String SAVE = "{\"format\":\"pokedev-backup\",\"team\":[],\"pc\":[]}";
  private static final Pattern TOKEN = Pattern.compile("\"token\":\"([^\"]+)\"");

  @TempDir Path folder;
  private Path database;
  private PokedevServer server;
  private final HttpClient client =
      HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();

  @BeforeEach
  void start() throws Exception {
    database = folder.resolve("test.db");
    server = PokedevServer.start(0, database.toString());
  }

  @AfterEach
  void stop() throws Exception {
    server.stop();
  }

  private HttpResponse<String> send(String method, String path, String token, String body)
      throws Exception {
    HttpRequest.Builder request =
        HttpRequest.newBuilder(URI.create("http://localhost:" + server.port() + path))
            .method(method, body == null ? BodyPublishers.noBody() : BodyPublishers.ofString(body));
    if (token != null) {
      request.header("Authorization", "Bearer " + token);
    }
    if (body != null) {
      request.header("Content-Type", "application/x-www-form-urlencoded");
    }
    return client.send(request.build(), BodyHandlers.ofString());
  }

  private static String form(String username, String password) {
    return "username=" + URLEncoder.encode(username, StandardCharsets.UTF_8)
        + "&password=" + URLEncoder.encode(password, StandardCharsets.UTF_8);
  }

  private HttpResponse<String> register(String username, String password) throws Exception {
    return send("POST", "/api/accounts", null, form(username, password));
  }

  private HttpResponse<String> login(String username, String password) throws Exception {
    return send("POST", "/api/sessions", null, form(username, password));
  }

  /** Crée un compte, s'y connecte et renvoie le jeton de session. */
  private String signIn(String username) throws Exception {
    register(username, "mot-de-passe");
    Matcher token = TOKEN.matcher(login(username, "mot-de-passe").body());
    assertTrue(token.find());
    return token.group(1);
  }

  @Test
  void inscritPuisConnecte() throws Exception {
    assertEquals(201, register("sacha", "pikachu-2026").statusCode());

    HttpResponse<String> session = login("sacha", "pikachu-2026");

    assertEquals(200, session.statusCode());
    assertTrue(session.body().contains("\"username\":\"sacha\""));
    assertTrue(TOKEN.matcher(session.body()).find());
  }

  @Test
  void refuseUnIdentifiantDejaPrisQuelleQueSoitLaCasse() throws Exception {
    register("sacha", "pikachu-2026");

    assertEquals(409, register("SACHA", "autre-mot-de-passe").statusCode());
  }

  @Test
  void refuseUnIdentifiantOuUnMotDePasseInvalide() throws Exception {
    assertEquals(400, register("s", "pikachu-2026").statusCode());
    assertEquals(400, register("sacha ketchum", "pikachu-2026").statusCode());
    assertEquals(400, register("sacha", "court").statusCode());
  }

  @Test
  void refuseUnMauvaisMotDePasseOuUnCompteInconnu() throws Exception {
    register("sacha", "pikachu-2026");

    assertEquals(401, login("sacha", "salameche").statusCode());
    assertEquals(401, login("ondine", "pikachu-2026").statusCode());
  }

  @Test
  void comprendLeCodageDuFormulaireEnvoyeParAngular() throws Exception {
    // HttpParams d'Angular laisse « @ = ; » tels quels et code l'UTF-8 : « p@ss=w;rd +é ».
    String angularBody = "username=sacha&password=p@ss=w;rd%20%2B%C3%A9";
    assertEquals(201, send("POST", "/api/accounts", null, angularBody).statusCode());

    assertEquals(200, login("sacha", "p@ss=w;rd +é").statusCode());
  }

  @Test
  void accepteLIdentifiantSansTenirCompteDeLaCasse() throws Exception {
    register("Sacha", "pikachu-2026");

    HttpResponse<String> session = login("sacha", "pikachu-2026");

    assertEquals(200, session.statusCode());
    assertTrue(session.body().contains("\"username\":\"Sacha\""));
  }

  @Test
  void sauvegardePuisRelitLEquipeEtLePc() throws Exception {
    String token = signIn("sacha");
    assertEquals(404, send("GET", "/api/accounts/me/save", token, null).statusCode());

    assertEquals(204, send("PUT", "/api/accounts/me/save", token, SAVE).statusCode());
    HttpResponse<String> save = send("GET", "/api/accounts/me/save", token, null);

    assertEquals(200, save.statusCode());
    assertEquals(SAVE, save.body());
  }

  @Test
  void remplaceLaSauvegardePrecedente() throws Exception {
    String token = signIn("sacha");
    send("PUT", "/api/accounts/me/save", token, "{\"version\":1}");

    send("PUT", "/api/accounts/me/save", token, "{\"version\":2}");

    assertEquals("{\"version\":2}", send("GET", "/api/accounts/me/save", token, null).body());
  }

  @Test
  void separeLesSauvegardesDesComptes() throws Exception {
    String sacha = signIn("sacha");
    String ondine = signIn("ondine");

    send("PUT", "/api/accounts/me/save", sacha, SAVE);

    assertEquals(404, send("GET", "/api/accounts/me/save", ondine, null).statusCode());
  }

  @Test
  void refuseUneSauvegardeTropVolumineuse() throws Exception {
    String token = signIn("sacha");

    String huge = "x".repeat(256 * 1024 + 1);

    assertEquals(413, send("PUT", "/api/accounts/me/save", token, huge).statusCode());
  }

  @Test
  void exigeUnJetonValide() throws Exception {
    assertEquals(401, send("GET", "/api/accounts/me/save", null, null).statusCode());
    assertEquals(401, send("GET", "/api/accounts/me/save", "jeton-invente", null).statusCode());
    assertEquals(401, send("DELETE", "/api/accounts/me", null, null).statusCode());
  }

  @Test
  void refuseUnJetonExpire() throws Exception {
    String token = signIn("sacha");
    try (var db = DriverManager.getConnection("jdbc:sqlite:" + database)) {
      db.createStatement().executeUpdate("UPDATE sessions SET expires_at = 0");
    }

    assertEquals(401, send("GET", "/api/accounts/me/save", token, null).statusCode());
  }

  @Test
  void laDeconnexionInvalideLeJeton() throws Exception {
    String token = signIn("sacha");

    assertEquals(204, send("DELETE", "/api/sessions/current", token, null).statusCode());

    assertEquals(401, send("GET", "/api/accounts/me/save", token, null).statusCode());
  }

  @Test
  void laSuppressionDuCompteEffaceToutEtLibereLIdentifiant() throws Exception {
    String token = signIn("sacha");
    send("PUT", "/api/accounts/me/save", token, SAVE);

    assertEquals(204, send("DELETE", "/api/accounts/me", token, null).statusCode());

    assertEquals(401, send("GET", "/api/accounts/me/save", token, null).statusCode());
    assertEquals(401, login("sacha", "mot-de-passe").statusCode());
    assertEquals(201, register("sacha", "nouveau-mot-de-passe").statusCode());
    try (var db = DriverManager.getConnection("jdbc:sqlite:" + database);
        var count = db.createStatement().executeQuery("SELECT COUNT(*) FROM saves")) {
      assertEquals(0, count.getInt(1));
    }
  }

  @Test
  void signaleUneRouteInconnue() throws Exception {
    assertEquals(404, send("GET", "/api/inconnue", null, null).statusCode());
  }

  @Test
  void signaleUnFormulaireMalEncode() throws Exception {
    assertEquals(400, send("POST", "/api/accounts", null, "username=%zz&password=x").statusCode());
  }
}
