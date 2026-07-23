describe("Módulo 1: Autenticación", () => {
  const uniqueSuffix = Date.now();
  const testEmail = `auth_test_${uniqueSuffix}@craftcontrol.test`;
  const testUsername = `AuthBot_${uniqueSuffix}`;
  const testPassword = "StrongPassword123!";
  it("Debe registrar un nuevo usuario correctamente", () => {
    cy.visit("/register");

    cy.get('[data-cy="register-username-input"]').type(testUsername);
    cy.get('[data-cy="register-email-input"]').type(testEmail);
    cy.get('[data-cy="register-password-input"]').type(testPassword);
    cy.get('[data-cy="register-submit-button"]').click();

    cy.url({ timeout: 15000 }).should("include", "/servers");
  });
  it("Debe cerrar sesión correctamente", () => {
    cy.visit("/login");

    cy.get('[data-cy="login-email-input"]').type(testEmail);
    cy.get('[data-cy="login-password-input"]').type(testPassword);
    cy.get('[data-cy="login-submit-button"]').click();

    cy.url({ timeout: 15000 }).should("include", "/servers");

    cy.get("button[title='Log Out'], button[title='Cerrar Sesión']").click({ force: true });

    cy.url().should("include", "/login");
  });
});
