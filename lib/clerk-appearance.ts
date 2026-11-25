// Clerk's sign-in, sign-up and user menu, dressed in the prototype's classes (design-system §12).
export const clerkAppearance = {
  variables: { colorPrimary: "#5466F0", colorText: "#17171C", colorTextSecondary: "#7C7C88", colorBackground: "#FFFFFF", colorInputBackground: "#FFFFFF", colorDanger: "#C2353A", colorSuccess: "#1F9D63", borderRadius: "14px", fontFamily: "var(--font-geist), system-ui, sans-serif" },
  elements: {
    cardBox: "shell ck", card: "shell-body ck-body", headerSubtitle: "ck-sub", socialButtons: "ck-social",
    socialButtonsBlockButton: "btn btn-soft", dividerRow: "ck-or", formFieldLabel: "ck-l", formFieldInput: "inp",
    formButtonPrimary: "btn btn-blue ck-go", formFieldErrorText: "ck-err", footer: "ck-foot",
  },
};
