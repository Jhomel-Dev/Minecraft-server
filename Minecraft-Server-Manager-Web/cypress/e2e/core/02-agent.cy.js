describe("Módulo 2: Agente Local", () => {
  const uniqueSuffix = Date.now();
  const testEmail = `agent_test_${uniqueSuffix}@craftcontrol.test`;
  const testUsername = `AgentBot_${uniqueSuffix}`;
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
  it("Debe registrarse, vincular el agente, hibernarlo y desvincularlo", () => {
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
    cy.get('[data-cy="dashboard-empty-title"]', { timeout: 10000 }).should("be.visible");
    cy.get('[data-cy="agent-connected-btn"]').click();
    cy.get('[data-cy="agent-hibernate-btn"]').click();
    cy.get('[data-cy="dashboard-create-server-empty"]').should("be.disabled");
    cy.get('[data-cy="agent-connected-btn"]').click();
    cy.get('[data-cy="agent-wake-btn"]').click();
    cy.get('[data-cy="dashboard-create-server-empty"]').should("not.be.disabled");
    cy.get('[data-cy="agent-connected-btn"]').click();
    cy.get('[data-cy="agent-unlink-btn"]').click();
    cy.get('[data-cy="agent-prepare-title"]', { timeout: 10000 }).should("be.visible");
  });
});
