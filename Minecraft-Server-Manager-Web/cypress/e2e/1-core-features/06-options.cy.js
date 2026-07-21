describe("Módulo 8: Opciones y Destrucción", () => {
  const uniqueSuffix = Date.now();
  const testEmail = `options_test_${uniqueSuffix}@craftcontrol.test`;
  const testUsername = `OptionsBot_${uniqueSuffix}`;
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

  it("Debe navegar por opciones, modificarlas, guardar y destruir el servidor", () => {
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

    cy.wait(500);
    cy.get("input[placeholder*='Ej. Mi Servidor Extremo']").type("Cypress Options Server");

    cy.contains("Vanilla").click();
    cy.contains("button", "Siguiente").click();

    cy.get("input[type='range']").invoke("val", 1).trigger("input", { force: true }).trigger("change", { force: true });

    cy.contains("button", "Siguiente").click();
    cy.contains("button", "Instalar y Arrancar").click();
    cy.contains("Desconectado", { timeout: 15000 }).should("be.visible");
    cy.contains("Opciones").click();
    cy.contains("button", "Eliminar Servidor...").click();
    cy.contains("button", "Sí, Eliminar").click();
    
    cy.url({ timeout: 10000 }).should("match", /\/servers$/);
    
    cy.contains("No tienes servidores", { timeout: 10000 }).should("be.visible");
  });
});
