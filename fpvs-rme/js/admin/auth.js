/* Login, team-based admin access, and logout. */
import { account, teams } from "./appwrite-client.js";

export function initAuth(onAuthenticated) {
  const loginScreen = document.getElementById("loginScreen");
  const adminScreen = document.getElementById("adminScreen");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    loginBtn.disabled = true;
    loginBtn.textContent = "Вхожу…";

    try {
      await account.createEmailPasswordSession(
        document.getElementById("email").value.trim(),
        document.getElementById("password").value
      );
      await checkAdminAndShow(onAuthenticated);
    } catch (error) {
      loginError.textContent = "Неверный email или пароль";
      console.error(error);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Войти";
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await account.deleteSession({ sessionId: "current" }).catch(() => {});
    showLogin(loginScreen, adminScreen);
    loginForm.reset();
  });

  checkAdminAndShow(onAuthenticated);
}

async function checkAdminAndShow(onAuthenticated) {
  const loginScreen = document.getElementById("loginScreen");
  const adminScreen = document.getElementById("adminScreen");
  const loginError = document.getElementById("loginError");
  let user;

  try {
    user = await account.get();
  } catch {
    showLogin(loginScreen, adminScreen);
    return;
  }

  let isAdmin = false;
  try {
    const list = await teams.list();
    isAdmin = list.teams.some((team) => team.$id === "admins");
  } catch (error) {
    console.error("Teams list error:", error);
  }

  if (!isAdmin) {
    loginError.textContent = "У вас нет прав администратора";
    await account.deleteSession({ sessionId: "current" }).catch(() => {});
    showLogin(loginScreen, adminScreen);
    return;
  }

  loginScreen.classList.add("hidden");
  adminScreen.classList.remove("hidden");
  document.getElementById("userInfo").textContent = `${user.email} · администратор`;
  onAuthenticated();
}

function showLogin(loginScreen, adminScreen) {
  loginScreen.classList.remove("hidden");
  adminScreen.classList.add("hidden");
}
