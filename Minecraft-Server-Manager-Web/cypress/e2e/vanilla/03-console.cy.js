describe("Módulo 5: Consola Interactiva", () => {
  const uniqueSuffix = Date.now();
  const testEmail = `console_test_${uniqueSuffix}@craftcontrol.test`;
  const testUsername = `ConsoleBot_${uniqueSuffix}`;
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

  it("Debe interactuar con la consola de comandos bidireccional", () => {
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
    
    cy.get("input[placeholder*='Ej. Mi Servidor Extremo']").type("Cypress Console Server");
    
    cy.contains("Vanilla").click();
    cy.contains("button", "Siguiente").click();

    cy.get("input[type='range']").invoke("val", 1).trigger("input", { force: true }).trigger("change", { force: true });
    
    cy.contains("button", "Siguiente").click();
    cy.contains("button", "Instalar y Arrancar").click();
    cy.contains("Desconectado", { timeout: 15000 }).should("be.visible");
    cy.contains("button", "Iniciar").click();
    cy.contains("Consola").click();
    
    cy.get(".whitespace-pre-wrap", { timeout: 45000 }).should("contain.text", "For help, type");
    cy.get("input[placeholder='Ejecuta un comando (ej. /say Hola a todos)']").type("say Hola Cypress");
    cy.get("button[type='submit']").click();
    cy.get(".whitespace-pre-wrap", { timeout: 15000 }).should("contain.text", "Hola Cypress");
    cy.get("button[title='Limpiar consola']").click();
    
    cy.contains("button", "Detener").click();
    cy.contains("Apagado", { timeout: 15000 }).should("be.visible");
  });
});
