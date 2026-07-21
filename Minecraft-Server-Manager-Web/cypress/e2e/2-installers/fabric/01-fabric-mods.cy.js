describe("Módulo Fabric: Creación y Mods", () => {
  const uniqueSuffix = Date.now();
  const testEmail = `fabric_test_${uniqueSuffix}@craftcontrol.test`;
  const testUsername = `FabricBot_${uniqueSuffix}`;
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

  it("Debe crear un servidor Fabric e instalar un Mod de optimización", () => {
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
    
    // Fabric Creation
    cy.wait(500);
    cy.get("input[placeholder*='Ej. Mi Servidor Extremo']").type("Cypress Fabric Server");
    cy.contains("h3", /^Fabric$/).click();
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
    cy.get("input[placeholder*='Buscar mods o plugins']").type("Fabric API");
    cy.get("button[type='submit']").click();
    
    cy.contains("Fabric API", { timeout: 15000 }).should("be.visible");
    
    cy.contains("h3", "Fabric API")
      .parent()
      .parent()
      .find("button")
      .contains("Instalar")
      .click();
    
    cy.contains("h3", "Fabric API")
      .parent()
      .parent()
      .find("button")
      .contains("Instalado", { timeout: 60000 })
      .should("be.visible");
    
    // Check Installed
    cy.contains("Instalados").click();
    cy.contains("h3", "Fabric API", { timeout: 5000 }).should("be.visible");
  });
});
