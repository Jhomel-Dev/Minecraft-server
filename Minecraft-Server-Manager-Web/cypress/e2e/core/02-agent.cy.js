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

    cy.contains("button", "Registrarse").click();

    cy.url({ timeout: 15000 }).should("include", "/servers");

    cy.get("input[type='text']").then(($inputs) => {
      for (let i = 0; i < 6; i++) {
        cy.wrap($inputs.eq(i)).type(agentPin[i]);
      }
    });

    cy.contains("¡Máquina Vinculada!", { timeout: 10000 }).should("be.visible");
    cy.contains("No tienes servidores", { timeout: 10000 }).should("be.visible");
    cy.contains("button", "Agente Conectado").click();
    cy.contains("button", "Hibernar").click();
    cy.contains("Crear mi primer servidor").should("be.disabled");
    cy.contains("button", "Agente Conectado").click();
    cy.contains("button", "Despertar").click();
    cy.contains("Crear mi primer servidor").should("not.be.disabled");
    cy.contains("button", "Agente Conectado").click();
    cy.contains("button", "Desvincular").click();
    cy.contains("Prepara tu Máquina", { timeout: 10000 }).should("be.visible");
  });
});
