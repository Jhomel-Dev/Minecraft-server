describe("Módulo 1: Autenticación", () => {
  const uniqueSuffix = Date.now();
  const testEmail = `auth_test_${uniqueSuffix}@neotokyo.com`;
  const testUsername = `AuthBot_${uniqueSuffix}`;
  const testPassword = "StrongPassword123!";

  it("Debe registrar un nuevo usuario correctamente", () => {
    cy.visit("/register");
    
    cy.get("input[type='text']").type(testUsername);
    cy.get("input[type='email']").type(testEmail);
    cy.get("input[type='password']").type(testPassword);
    
    cy.contains("button", "Registrarse").click();
    
    cy.url({ timeout: 15000 }).should("include", "/servers");
  });

  it("Debe cerrar sesión correctamente", () => {
    cy.visit("/login");
    
    cy.get("input[type='email']").type(testEmail);
    cy.get("input[type='password']").type(testPassword);
    
    cy.contains("button", "Entrar a CraftControl").click();
    
    cy.url({ timeout: 15000 }).should("include", "/servers");

    cy.get("button[title='Cerrar Sesión']").click({ force: true });
    
    cy.url().should("include", "/login");
  });
});
