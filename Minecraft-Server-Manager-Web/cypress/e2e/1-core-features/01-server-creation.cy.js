describe("Módulo 3: Creación de Servidor", () => {
  const uniqueSuffix = Date.now();
  const testEmail = `server_test_${uniqueSuffix}@craftcontrol.test`;
  const testUsername = `CreatorBot_${uniqueSuffix}`;
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
  it("Debe navegar por el Wizard e instalar un servidor Vanilla", () => {
    cy.visit("/register");

    cy.get('[data-cy="register-username-input"]').type(testUsername);
    cy.get('[data-cy="register-email-input"]').type(testEmail);
    cy.get('[data-cy="register-password-input"]').type(testPassword);
    cy.get('[data-cy="register-submit-button"]').click();

    cy.url({ timeout: 15000 }).should("include", "/servers");

    cy.get("input[data-cy^='agent-pin-input-']").then(($inputs) => {
      for (let i = 0; i < 6; i++) {
        cy.wrap($inputs.eq(i)).type(agentPin[i]);
      }
    });
    cy.get('[data-cy="agent-linked-success-msg"]', { timeout: 10000 }).should("be.visible");
    cy.get('[data-cy="dashboard-empty-title"]', { timeout: 10000 }).should("be.visible");
    cy.get('[data-cy="dashboard-create-server-empty"]').click();

    cy.wait(500);

    cy.get('[data-cy="wizard-server-name-input"]').type("Cypress Modular Server");
    cy.get('[data-cy="wizard-software-vanilla"]').click();
    cy.get('[data-cy="wizard-step1-next"]').click();
    cy.get('[data-cy="wizard-ram-input"]').invoke("val", 1).trigger("input", { force: true }).trigger("change", { force: true });
    cy.get('[data-cy="wizard-step2-next"]').click();
    cy.get('[data-cy="wizard-install-button"]').click();
    cy.get('[data-cy="server-status-text"]', { timeout: 15000 }).should('contain', 'Desconectado');
  });
});
