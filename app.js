/* =========================================================
   Sistema de Facturación — Lógica de Aplicación
   ========================================================= */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxuIXencyzGH2HLBVAptu4DRQ4l9Pq-IluCKiNmyQmEuwQKWKtEgMpAxvj3BWxcGYRc/exec';

const EMPRESAS = {
  flota: { 
    nombre: "APARTAMENTOS FLOTA DE INDIAS S.L.", 
    cif: "CIF: B90362906", 
    direccion: "C/ Pozo Nuevo 1 1A, 41927 Mairena del Aljarafe" 
  },
  carrascal: { 
    nombre: "CARRASCAL & MEDINA SL", 
    cif: "CIF: B56344088", 
    direccion: "Fernández y González, 16 Bajo D, 41002 Sevilla" 
  }
};

const CREDENTIALS = { usuario: "flotadeindias", contraseña: "Flotadeindias.02" };

// 1. Control de Autenticación
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value.trim();

  if (user === CREDENTIALS.usuario && pass === CREDENTIALS.contraseña) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    initApp();
  } else {
    alert('Usuario o contraseña incorrectos');
  }
});

function initApp() {
  updateCompanyDetails();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('invoiceDate').value = today;
  updatePreview();
}

// 2. Obtención secuencial del número de factura
async function fetchInvoiceNumber(companyKey) {
  const numInput = document.getElementById('invoiceNumber');
  numInput.value = 'Cargando...';
  try {
    const response = await fetch(`${SCRIPT_URL}?empresa=${companyKey}`);
    const data = await response.json();
    
    const ultimaStr = data.ultimaFactura || "F-50000";
    const numeroPuro = parseInt(ultimaStr.replace(/\D/g, ''), 10) || 50000;
    const nueva = numeroPuro + 1;
    
    numInput.value = `F-${nueva.toString().padStart(5, '0')}`;
  } catch (error) {
    console.error("Error al obtener numeración:", error);
    numInput.value = 'F-50001';
  }
  updatePreview();
}

// 3. Cambio de Empresa
document.getElementById('companySelect').addEventListener('change', updateCompanyDetails);

function updateCompanyDetails() {
  const key = document.getElementById('companySelect').value;
  const empresa = EMPRESAS[key];
  document.getElementById('prev-companyName').textContent = empresa.nombre;
  document.getElementById('prev-companyCif').textContent = empresa.cif;
  document.getElementById('prev-companyAddress').textContent = empresa.direccion;
  fetchInvoiceNumber(key);
}

// 4. Actualización en tiempo real
const invoiceForm = document.getElementById('invoiceForm');
invoiceForm.addEventListener('input', updatePreview);
invoiceForm.addEventListener('change', updatePreview);

function updatePreview() {
  const getVal = (id) => document.getElementById(id)?.value || '';

  const rawNum = getVal('invoiceNumber') || 'F-50001';
  document.getElementById('prev-invoiceNumber').textContent = rawNum;

  // Formato Fecha ES
  const invDate = getVal('invoiceDate');
  if (invDate) {
    const [y, m, d] = invDate.split('-');
    document.getElementById('prev-invoiceDate').textContent = `${d}/${m}/${y}`;
  } else {
    document.getElementById('prev-invoiceDate').textContent = '-';
  }

  document.getElementById('prev-customerName').textContent = getVal('customerName') || 'Nombre Cliente';
  document.getElementById('prev-cifNif').textContent = getVal('cifNif') || 'CIF/NIF Cliente';
  document.getElementById('prev-address').textContent = getVal('address') || 'Domicilio';

  const cp = getVal('postalCode');
  const prov = getVal('province');
  document.getElementById('prev-location').textContent = (cp || prov) ? `${cp} ${prov}`.trim() : 'Población / Provincia';

  const entryStr = getVal('entryDate');
  const exitStr = getVal('exitDate');
  
  if (entryStr && exitStr) {
    const [y1, m1, d1] = entryStr.split('-').map(Number);
    const [y2, m2, d2] = exitStr.split('-').map(Number);

    const dEntry = new Date(y1, m1 - 1, d1);
    const dExit = new Date(y2, m2 - 1, d2);

    const diffTime = dExit - dEntry;
    const nights = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const diaEntrada = dEntry.getDate();
    const diaSalida = dExit.getDate();
    const mesNombre = meses[dExit.getMonth()];

    document.getElementById('prev-concept').textContent = `ESTANCIA APARTAMENTO (${diaEntrada} - ${diaSalida} ${mesNombre})`;
    document.getElementById('prev-nights').textContent = nights;
  } else {
    document.getElementById('prev-concept').textContent = 'ESTANCIA APARTAMENTO';
    document.getElementById('prev-nights').textContent = '0';
  }

  const total = parseFloat(getVal('totalPrice')) || 0;
  const formattedTotal = `${total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  
  document.getElementById('prev-total').textContent = formattedTotal;
  document.getElementById('prev-baseTotal').textContent = formattedTotal;
  document.getElementById('prev-finalTotal').textContent = formattedTotal;
}

// 5. Registro y Generación de PDF
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
  const btn = document.getElementById('downloadPdfBtn');
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  const companyKey = document.getElementById('companySelect').value;
  const numFactura = document.getElementById('invoiceNumber').value.trim() || 'F-50001';
  const cliente = document.getElementById('customerName').value || 'Cliente';

  const payload = {
    numeroFactura: numFactura,
    fecha: document.getElementById('invoiceDate').value,
    cliente: cliente,
    cif: document.getElementById('cifNif').value,
    domicilio: document.getElementById('address').value,
    cp: document.getElementById('postalCode').value,
    provincia: document.getElementById('province').value,
    concepto: document.getElementById('prev-concept').textContent,
    noches: document.getElementById('prev-nights').textContent,
    importeTotal: document.getElementById('totalPrice').value,
    empresaEmisora: EMPRESAS[companyKey].nombre
  };

  // Guardar datos en Google Sheets
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Error al registrar la factura:", err);
  }

  // Generación de la descarga PDF (Ajustado para 1 sola página exacta)
  const element = document.getElementById('invoice-preview');
  
  /* Nombre de archivo estandarizado: FACTURA F-50001.pdf */
  const fileName = `FACTURA_${numFactura}.pdf`.replace(/\s+/g, '_');

  const opt = {
    margin: 0,
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      scrollY: 0
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    await html2pdf().set(opt).from(element).save();

    // Resetear formulario tras confirmar la descarga
    document.getElementById('customerName').value = '';
    document.getElementById('cifNif').value = '';
    document.getElementById('address').value = '';
    document.getElementById('postalCode').value = '';
    document.getElementById('province').value = '';
    document.getElementById('entryDate').value = '';
    document.getElementById('exitDate').value = '';
    document.getElementById('totalPrice').value = '';

    await fetchInvoiceNumber(companyKey);
    updatePreview();
  } catch (err) {
    console.error("Error en la generación de PDF:", err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-file-earmark-pdf-fill"></i> Descargar Factura PDF';
  }
});
