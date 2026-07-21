describe("Módulo Paper: Creación y Plugins", () => {
  const uniqueSuffix = Date.now();
  const testEmail = `paper_test_${uniqueSuffix}@craftcontrol.test`;
  const testUsername = `PaperBot_${uniqueSuffix}`;
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

  it("Debe crear un servidor Paper e instalar un Plugin mediante la UI de Modrinth", () => {
    // 1. Registro y Vinculación
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
    
    // 2. Creación del Servidor Paper
    cy.wait(500);
    cy.get("input[placeholder*='Ej. Mi Servidor Extremo']").type("Cypress Paper Server");
    cy.contains("h3", /^PaperMC$/).click();
    cy.wait(500);
    cy.contains("button", "Siguiente").click({ force: true });
    // Esperar a que se habiliten las versiones (carga desde la API de Paper)
    cy.get("select", { timeout: 15000 }).eq(0).select("1.20.1");
    cy.get("select", { timeout: 15000 }).eq(0).should("not.contain", "Obteniendo", { timeout: 15000 });
    cy.get("select", { timeout: 15000 }).eq(1).should("not.contain", "Buscando", { timeout: 15000 });
    cy.get("input[type='range']").invoke("val", 1).trigger("input", { force: true }).trigger("change", { force: true });
    cy.wait(500);
    cy.contains("button", "Siguiente").click({ force: true });
    cy.contains("button", "Instalar y Arrancar").click();
    
    // El servidor tarda más en arrancar la primera vez porque descarga Java y los .jars de Paper.
    cy.contains("Desconectado", { timeout: 180000 }).should("be.visible");
    
    // 3. Ir a la pestaña Plugins
    cy.contains("Plugins").click();
    
    // Validar estado vacío inicial
    cy.contains("No hay plugins instalados", { timeout: 10000 }).should("be.visible");

    // 4. Buscar e Instalar Plugin desde Store
    cy.contains("Explorar Store").click();
    cy.get("input[placeholder*='Buscar mods o plugins']").type("EssentialsX");
    cy.get("button[type='submit']").click();
    
    cy.contains("EssentialsX", { timeout: 15000 }).should("be.visible");
    
    // Hacer click en el botón de Instalar de la tarjeta de EssentialsX
    cy.contains("h3", "EssentialsX")
      .parent()
      .parent()
      .find("button")
      .contains("Instalar")
      .click();
    
    // Verificar que cambie a estado Instalado
    cy.contains("h3", "EssentialsX")
      .parent()
      .parent()
      .find("button")
      .contains("Instalado", { timeout: 30000 })
      .should("be.visible");
    
    // 5. Verificar metadata e instalación en la pestaña Instalados
    cy.contains("Instalados").click();
    cy.contains("h3", "EssentialsX", { timeout: 5000 }).should("be.visible");
    
    // Verificar la advertencia de reinicio
    // // cy.contains("Hay cambios pendientes. Reinicia el servidor").should("be.visible");
  });
});
