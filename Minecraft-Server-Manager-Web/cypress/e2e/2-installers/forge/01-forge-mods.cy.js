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
    cy.contains("button", "Registrarse").click();
    cy.url({ timeout: 15000 }).should("include", "/servers");
    cy.get("input[type='text']").then(($inputs) => {
      for (let i = 0; i < 6; i++) {
        cy.wrap($inputs.eq(i)).type(agentPin[i]);
      }
    });
    cy.contains("¡Máquina Vinculada!", { timeout: 15000 }).should("be.visible");
    cy.contains("Crear Servidor").click();
    
    // Forge Creation
    cy.wait(500);
    cy.get("input[placeholder*='Ej. Mi Servidor Extremo']").type("Cypress Forge Server");
    cy.contains("h3", /^Forge$/).click();
    cy.wait(500);
    cy.contains("button", "Siguiente").click({ force: true });
    
    cy.get("select", { timeout: 15000 }).eq(0).select("1.20.1");
    cy.get("select", { timeout: 15000 }).eq(0).should("not.contain", "Obteniendo", { timeout: 15000 });
    cy.get("select", { timeout: 15000 }).eq(1).should("not.contain", "Buscando", { timeout: 15000 });
    cy.get("input[type='range']").invoke("val", 1).trigger("input", { force: true }).trigger("change", { force: true });
    cy.wait(500);
    cy.contains("button", "Siguiente").click({ force: true });
    cy.contains("button", "Instalar y Arrancar").click();
    
    cy.contains("Desconectado", { timeout: 180000 }).should("be.visible");
    
    // Mods Tab
    cy.contains("Mods").click();
    cy.contains("No hay mods instalados", { timeout: 10000 }).should("be.visible");

    // Install Mod
    cy.contains("Explorar Store").click();
    cy.get("input[placeholder*='Buscar mods o plugins']").type("Just Enough Items");
    cy.get("button[type='submit']").click();
    
    cy.contains("Just Enough Items", { timeout: 15000 }).should("be.visible");
    
    cy.contains("h3", "Just Enough Items")
      .parent()
      .parent()
      .find("button")
      .contains("Instalar")
      .click();
    
    cy.contains("h3", "Just Enough Items")
      .parent()
      .parent()
      .find("button")
      .contains("Instalado", { timeout: 30000 })
      .should("be.visible");
    
    // Check Installed and Delete
    cy.contains("Instalados").click();
    cy.contains("h3", "Just Enough Items", { timeout: 5000 }).should("be.visible");
    // cy.contains("Hay cambios pendientes. Reinicia el servidor").should("be.visible");

    // Trigger delete
    cy.contains("h3", "Just Enough Items").parents(".bg-surface").find("button.text-red-500").click({ force: true });
    cy.contains("¿Eliminar Just Enough Items").should("be.visible");
    cy.contains("button", "Sí, eliminar").click();
    
    // Validate deletion
    cy.contains("No hay mods instalados", { timeout: 10000 }).should("be.visible");
  });
});
