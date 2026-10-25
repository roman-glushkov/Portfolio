/* Shared Appwrite SDK instances for the separate admin application. */
const { Client, Account, Teams, Databases, Query, Storage, ID } =
  window.Appwrite;

// ВОТ ЭТОТ ЭКСПОРТ ПОТЕРЯЛСЯ
export const config = window.APPWRITE_CONFIG;

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId);

export const account = new Account(client);
export const teams = new Teams(client);
export const db = new Databases(client);
export const storage = new Storage(client);
export { Query, ID };
