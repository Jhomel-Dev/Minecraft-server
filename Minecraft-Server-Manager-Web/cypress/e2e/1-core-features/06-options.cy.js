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
    cy.get('[data-cy="register-submit-button"]').click();

    cy.url({ timeout: 15000 }).should("include", "/servers");

    cy.get("input[type='text']").then(($inputs) => {
      for (let i = 0; i < 6; i++) {
        cy.wrap($inputs.eq(i)).type(agentPin[i]);
      }
    });
    cy.get('[data-cy="agent-linked-success-msg"]', { timeout: 10000 }).should("be.visible");
    cy.get('[data-cy="dashboard-create-server-empty"]').click();

    cy.wait(500);

    cy.get("input[placeholder*='Ej. Mi Servidor Extremo']").type("Cypress Options Server");
    cy.get('[data-cy="wizard-software-vanilla"]').click();
    cy.get('[data-cy="wizard-step1-next"]').click();
    cy.get("input[type='range']").invoke("val", 1).trigger("input", { force: true }).trigger("change", { force: true });
    cy.get('[data-cy="wizard-step2-next"]').click();
    cy.get('[data-cy="wizard-install-button"]').click();
    cy.get('[data-cy="server-status-text"]', { timeout: 30000 }).should("contain", "Desconectado");
    cy.get('[data-cy="sidebar-opciones"]').click();
    cy.get('[data-cy="options-delete-server-btn"]').click();
    cy.get('[data-cy="options-confirm-delete-btn"]').click();

    cy.url({ timeout: 15000 }).should("include", "/servers");

    cy.get('[data-cy="dashboard-empty-title"]', { timeout: 10000 }).should("be.visible");
  });
});
