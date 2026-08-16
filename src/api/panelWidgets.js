import api from "./axios";

export const getPanelWidgets = () => api.get("/panel-widgets").then(r => r.data);
export const savePanelWidgets = (widgets) => api.put("/panel-widgets", { widgets }).then(r => r.data);
