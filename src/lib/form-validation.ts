import type { FormEvent } from "react";

type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export const lithuanianValidation = {
  onInvalid(event: FormEvent<FormField>) {
    const field = event.currentTarget;
    field.setCustomValidity("");
    if (field.validity.valueMissing) {
      field.setCustomValidity("Užpildykite šį lauką.");
    } else if (
      field.validity.typeMismatch &&
      field instanceof HTMLInputElement &&
      field.type === "email"
    ) {
      field.setCustomValidity("Įveskite tinkamą el. pašto adresą.");
    } else if (field.validity.tooShort) {
      field.setCustomValidity(
        `Įveskite bent ${(field as HTMLInputElement | HTMLTextAreaElement).minLength} simbolius.`,
      );
    } else if (!field.validity.valid) {
      field.setCustomValidity("Patikrinkite įvestą reikšmę.");
    }
  },
  onInput(event: FormEvent<FormField>) {
    event.currentTarget.setCustomValidity("");
  },
};
