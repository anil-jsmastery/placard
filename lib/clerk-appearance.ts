export const clerkAppearance = {
  variables: {
    colorPrimary: "#16181d",
    colorText: "#16181d",
    colorTextSecondary: "#5d6370",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#16181d",
    colorDanger: "#c8372d",
    colorSuccess: "#16794a",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-figtree), ui-sans-serif, system-ui, sans-serif",
  },
};

// Sign-in and sign-up cards on phones (design-system §13): 40 px buttons and inputs, 16 px input text.
// `!` because Clerk's own styles aren't in a CSS layer and would win over Tailwind's utilities.
export const authCardAppearance = {
  elements: {
    socialButtonsBlockButton: "h-10! sm:h-8!",
    formButtonPrimary: "h-10! sm:h-8!",
    formFieldInput: "h-10! min-h-10! text-base! sm:h-8! sm:min-h-8! sm:text-[13px]!",
    otpCodeFieldInput: "text-base! sm:text-[13px]!",
  },
};
