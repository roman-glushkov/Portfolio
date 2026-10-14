/* In-memory cache shared by the requests table and its detail modal. */
let leads = [];

export function setLeads(items) {
  leads = Array.isArray(items) ? items : [];
}

export function getLeadById(id) {
  return leads.find((lead) => lead.$id === id);
}

export function markLeadProcessed(id) {
  const lead = getLeadById(id);
  if (lead) lead.status = "processed";
}
