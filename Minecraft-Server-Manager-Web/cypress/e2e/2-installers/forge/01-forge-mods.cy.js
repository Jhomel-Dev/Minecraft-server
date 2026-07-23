describe("Módulo Forge: Creación y Mods", () => {
  const uniqueSuffix = Date.now();
  const testEmail = `forge_test_${uniqueSuffix}@craftcontrol.test`;
  const testUsername = `ForgeBot_${uniqueSuffix}`;
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
  it("Debe crear un servidor Forge e instalar y eliminar un Mod mediante la UI", () => {
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
    cy.get('[data-cy="agent-linked-success-msg"]', { timeout: 15000 }).should("be.visible");
    cy.get('[data-cy="dashboard-create-server-empty"]').click();

    cy.wait(500);

    cy.get('[data-cy="wizard-server-name-input"]').type("Cypress Forge Server");
    cy.get('[data-cy="wizard-software-forge"]').click();

    cy.wait(500);

    cy.get('[data-cy="wizard-step1-next"]').click({ force: true });
    cy.get("select", { timeout: 15000 }).eq(0).select("1.20.1");
    cy.get("select", { timeout: 15000 }).eq(0).should("not.contain", "Obteniendo", { timeout: 15000 });
    cy.get("select", { timeout: 15000 }).eq(1).should("not.contain", "Buscando", { timeout: 15000 });
    cy.get("input[type='range']").invoke("val", 1).trigger("input", { force: true }).trigger("change", { force: true });

    cy.wait(500);

    cy.get('[data-cy="wizard-step2-next"]').click({ force: true });
    cy.get('[data-cy="wizard-install-button"]').click();
    cy.get('[data-cy="server-status-text"]', { timeout: 180000 }).should("contain", "Desconectado");
    cy.get('[data-cy="sidebar-mods"]').click();
    cy.get('[data-cy="modlist-empty-installed"]', { timeout: 10000 }).should("be.visible");
    cy.get('[data-cy="modlist-store-tab"]').click();
    cy.get('[data-cy="modlist-search-input"]').type("Just Enough Items");
    cy.get('[data-cy="modlist-search-btn"]').click();
    cy.get('[data-cy="store-item-just-enough-items-(jei)"]', { timeout: 15000 }).should("be.visible");
    cy.get('[data-cy="store-item-just-enough-items-(jei)"]').parents('.bg-surface').find('[data-cy="modlist-install-btn"]').click();
    cy.get('[data-cy="store-item-just-enough-items-(jei)"]').parents('.bg-surface').find('[data-cy="modlist-installed-badge"]', { timeout: 30000 }).should("be.visible");
    cy.get('[data-cy="modlist-installed-tab"]').click();
    cy.get('[data-cy="modlist-item-just-enough-items-(jei)"]', { timeout: 5000 }).should("be.visible");
    cy.get('[data-cy="modlist-delete-btn"]').click({ force: true });
    cy.get('[data-cy="modlist-delete-confirm-msg"]').should("be.visible");
    cy.get('[data-cy="modlist-delete-confirm-btn"]').click();
    cy.get('[data-cy="modlist-empty-installed"]', { timeout: 10000 }).should("be.visible");
  });
});
