/**
 * Clerk's widgets, dressed in the Forge palette.
 *
 * The values are read from the same CSS custom properties the rest of the UI
 * uses, so the sign-in card follows the theme — including the light/dark switch
 * — instead of being a differently-coloured island in the middle of the page.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "hsl(var(--forge-primary))",
    colorBackground: "hsl(var(--forge-bg-elevated))",
    colorInputBackground: "hsl(var(--forge-surface))",
    colorText: "hsl(var(--forge-text))",
    colorTextSecondary: "hsl(var(--forge-text-muted))",
    colorInputText: "hsl(var(--forge-text))",
    colorDanger: "hsl(var(--forge-danger))",
    colorSuccess: "hsl(var(--forge-success))",
    colorWarning: "hsl(var(--forge-warning))",
    borderRadius: "0.75rem",
  },
  elements: {
    card: "shadow-none border border-border-subtle bg-bg-elevated",
    headerTitle: "text-text-primary",
    headerSubtitle: "text-text-muted",
    socialButtonsBlockButton: "border-border-strong text-text-primary",
    dividerLine: "bg-border-subtle",
    dividerText: "text-text-subtle",
    formFieldLabel: "text-text-primary",
    footerActionText: "text-text-muted",
    footerActionLink: "text-forge hover:text-forge",
  },
} as const;
