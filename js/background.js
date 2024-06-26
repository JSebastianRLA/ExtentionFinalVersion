// Definir una variable global para almacenar las credenciales y los eventos anteriores
let credentials = null;
let eventosAnteriores = [];
const maxEventosAlmacenados = 10; // Definir el máximo de eventos almacenados

// Obtener las credenciales almacenadas del almacenamiento local al inicio
chrome.storage.local.get(["credentials"], function (items) {
  credentials = items.credentials;
});

// No es necesario verificar las credenciales cada vez que se abre la extensión
// Deja la lógica de verificación solo cuando se envían nuevas credenciales

// Escuchar mensajes del script de contenido
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "saveCredentials") {
    // Almacenar las credenciales proporcionadas por el usuario
    credentials = request.credentials;

    // Guardar las credenciales en el almacenamiento local para su uso futuro
    chrome.storage.local.set({ credentials: credentials });

    sendResponse({ success: true }); // Confirmar que las credenciales se guardaron correctamente
  }
});

// Definir la función para verificar cambios en la API
function checkAPIForChanges() {
  if (!credentials) {
    console.log("Faltan credenciales para realizar la consulta a la API.");
    return;
  }

  // Construir la URL de la API utilizando las credenciales almacenadas
  const { dns, apiPass, username, password } = credentials;
  const apiUrl = `https://${dns}/pandora_console/include/api.php?op=get&op2=events&return_type=json&apipass=${apiPass}&user=${username}&pass=${password}`;
  console.log(apiUrl);
  // Obtener los datos de la API
  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("La solicitud a la API falló: " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      console.log(data);
      const nuevosEventos = data.data;
      console.log("Eventos nuevos recibidos:", nuevosEventos.length);

      // Filtrar los eventos que no estén en la lista de eventos almacenados
      const eventosNuevos = nuevosEventos.filter((evento) => {
        return !eventosAnteriores.some(
          (eventoAnterior) => eventoAnterior.id_evento === evento.id_evento
        );
      });

      console.log(data.data[0].event_type);
      console.log("Eventos nuevos filtrados:", eventosNuevos);

      // Si hay eventos nuevos, mostrar una notificación
      if (eventosNuevos.length > 0) {
        eventosNuevos.forEach((evento) => {
          if (
            evento.event_type === "going_up_critical" ||
            evento.event_type === "going_down_critical" ||
            evento.event_type === "going_down_warning" ||
            evento.event_type === "going_up_warning"
          ) {
            console.log(evento.event_type);
            let mensaje = "";

            switch (evento.event_type) {
              case "going_up_critical":
                mensaje = "Hay un nuevo evento crítico.";
                // audioCritico.play();
                break;
              case "going_down_critical":
                mensaje = "Hay un nuevo evento crítico.";
                // audioCritico.play();
                break;
              case "going_down_warning":
                mensaje = "Hay un nuevo evento peligroso.";
                // audioPeligroso.play();
                break;
              case "going_up_warning":
                mensaje = "Hay un nuevo evento peligroso.";
                // audioPeligroso.play();
                break;
            }
            const fechaHoraActual = new Date().toLocaleString();
            chrome.notifications.create(null, {
              type: "basic",
              iconUrl: "images/icon128.png",
              title: "¡Nuevo evento!",
              message: `${mensaje}, en el agente con ID ${evento.id_agente}, con fecha y hora: ${fechaHoraActual}`,
            });
          }
          console.log("Evento normal");
        });
      }

      // Actualizar los eventos almacenados
      eventosAnteriores = nuevosEventos;

      // Enviar la data al popup
      chrome.runtime.sendMessage({
        action: "apiData",
        eventos: nuevosEventos,
      });
    })
    .catch((error) => {
      console.error("Error al obtener datos de la API:", error);
    });
  // Si no hay eventos nuevos, mostrar el mensaje "Sin eventos nuevos"
  if (eventosNuevos.length === 0) {
    document.getElementById("noEventsMessage").style.display = "block";
  } else {
    document.getElementById("noEventsMessage").style.display = "none";
  }
}

// Establecer intervalo para llamar a la función cada 10 segundos
setInterval(checkAPIForChanges, 10000);
