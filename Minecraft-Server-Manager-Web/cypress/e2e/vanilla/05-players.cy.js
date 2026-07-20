describe("Módulo 7: Gestión de Jugadores", () => {
  const uniqueSuffix = Date.now();
  const testEmail = `players_test_${uniqueSuffix}@neotokyo.com`;
  const testUsername = `PlayersBot_${uniqueSuffix}`;
  const testPassword = "StrongPassword123!";
  let agentPin;

  before(() => {
    cy.task("startAgent").then((pin) => {
      agentPin = pin;
      
      expect(agentPin).to.be.a("string");
      expect(agentPin).to.have.length(6);
    });
  });

  after(() => {
    cy.task("stopAgent");
  });

  it("Debe navegar e interactuar con la gestión de jugadores", () => {
    cy.visit("/register");

    cy.get("input[type='text']").type(testUsername);
    cy.get("input[type='email']").type(testEmail);
    cy.get("input[type='password']").type(testPassword);

    cy.contains("button", "Registrarse").click();

    cy.url({ timeout: 15000 }).should("include", "/servers");

    cy.get("input[type='text']").then(($inputs) => {
      for (let i = 0; i < 6; i++) {
        cy.wrap($inputs.eq(i)).type(agentPin[i]);
      }
    });

    cy.contains("¡Máquina Vinculada!", { timeout: 10000 }).should("be.visible");
    cy.contains("Crear Servidor").click();

    cy.get("input[placeholder*='Ej. Mi Servidor Extremo']").type("Cypress Players Server");

    cy.contains("Vanilla").click();
    cy.contains("button", "Siguiente").click();

    cy.get("input[type='range']").invoke("val", 1).trigger("input", { force: true }).trigger("change", { force: true });

    cy.contains("button", "Siguiente").click();
    cy.contains("button", "Instalar y Arrancar").click();
    cy.contains("Desconectado", { timeout: 15000 }).should("be.visible");
    cy.contains("Jugadores").click();
    cy.contains("Ops").click();
    cy.contains("Whitelist").click();
    cy.contains("Baneados (Jugadores)").click();
    cy.contains("Baneados (IP)").click();
  });
});
