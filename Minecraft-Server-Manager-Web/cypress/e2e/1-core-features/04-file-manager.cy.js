describe("Módulo 6: Gestor de Archivos", () => {
  const uniqueSuffix = Date.now();
  const testEmail = `files_test_${uniqueSuffix}@craftcontrol.test`;
  const testUsername = `FilesBot_${uniqueSuffix}`;
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
  it("Debe interactuar con el gestor de archivos", () => {
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

    cy.get("input[placeholder*='Ej. Mi Servidor Extremo']").type("Cypress Files Server");
    cy.get('[data-cy="wizard-software-vanilla"]').click();
    cy.get('[data-cy="wizard-step1-next"]').click();
    cy.get("input[type='range']").invoke("val", 1).trigger("input", { force: true }).trigger("change", { force: true });
    cy.get('[data-cy="wizard-step2-next"]').click();
    cy.get('[data-cy="wizard-install-button"]').click();
    cy.get('[data-cy="server-status-text"]', { timeout: 15000 }).should("contain", "Desconectado");
    cy.get('[data-cy="server-start-btn"]').click();
    cy.get('[data-cy="server-status-text"]', { timeout: 45000 }).should("contain", "En Línea");
    cy.get('[data-cy="server-stop-btn"]').click();
    cy.get('[data-cy="server-status-text"]', { timeout: 15000 }).should("contain", "Desconectado");
    cy.get('[data-cy="sidebar-archivos"]').click();
    cy.get('[data-cy="file-row-server.properties"]', { timeout: 10000 }).should("be.visible");
    cy.get('[data-cy="file-edit-btn-server.properties"]').click();
    cy.get('[data-cy="file-editor-loading-text"]', { timeout: 15000 }).should("not.exist");
    cy.get('[data-cy="file-editor-save-btn"]', { timeout: 15000 }).should("be.visible");
  });
});
