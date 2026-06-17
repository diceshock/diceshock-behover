const form = document.getElementById("wx-silent-form") as HTMLFormElement;
const csrfInput = document.getElementById("wx-csrf") as HTMLInputElement;

fetch("/api/auth/csrf")
  .then((r) => r.json())
  .then((d: { csrfToken: string }) => {
    csrfInput.value = d.csrfToken;
    form.submit();
  });
