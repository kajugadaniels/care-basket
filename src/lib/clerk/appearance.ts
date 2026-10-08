// Maps Clerk's prebuilt UI to CareBasket design tokens. Clerk accepts CSS variables as
// appearance values; they need a current evergreen browser, which the app already requires.
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--color-primary)",
    colorPrimaryForeground: "var(--color-on-primary)",
    colorForeground: "var(--color-text)",
    colorMutedForeground: "var(--color-text-muted)",
    colorBackground: "var(--color-surface)",
    colorInput: "var(--color-surface)",
    colorInputForeground: "var(--color-text)",
    colorBorder: "var(--color-border-strong)",
    colorRing: "var(--color-focus)",
    colorDanger: "var(--color-danger)",
    colorSuccess: "var(--color-success)",
    colorWarning: "var(--color-warning)",
    fontFamily: "var(--font-sans)",
    fontFamilyButtons: "var(--font-sans)",
    fontSize: "var(--text-base)",
    borderRadius: "var(--radius-md)",
  },
};

// Keeps the account menu trigger close to the 48px control size used across the app.
export const userButtonAppearance = {
  elements: {
    userButtonAvatarBox: {
      width: "calc(var(--space-6) + var(--space-2))",
      height: "calc(var(--space-6) + var(--space-2))",
    },
  },
};
