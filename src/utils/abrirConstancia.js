// Abre una constancia en otra pestaña. La pestaña se abre antes de pedir la URL
// para que el navegador no la bloquee como ventana emergente.
export async function abrirConstancia(obtenerUrl) {
  const ventana = window.open("about:blank", "_blank");
  try {
    const { url } = await obtenerUrl();
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
  } catch (err) {
    ventana?.close();
    throw err;
  }
}
