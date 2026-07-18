
(() => {
  const C = window.HIGHFIELD_CONFIG;
  const U = window.HighfieldUtils;

  const form = document.getElementById("verificationForm");
  const input = document.getElementById("certificateInput");
  const verifyButton = document.getElementById("verifyButton");
  const resultArea = document.getElementById("resultArea");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const previewModal = document.getElementById("previewModal");
  const modalCanvas = document.getElementById("modalCanvas");
  const closeModalButton = document.getElementById("closeModalButton");
  const zoomInButton = document.getElementById("zoomInButton");
  const zoomOutButton = document.getElementById("zoomOutButton");
  const resetZoomButton = document.getElementById("resetZoomButton");

  let currentCertificate = null;
  let currentZoom = 1;

  form.addEventListener("submit", event => {
    event.preventDefault();
    verifyCertificate();
  });

  window.addEventListener("DOMContentLoaded", () => {
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }

    const certificateNumber = new URLSearchParams(location.search).get("certificate");
    if(certificateNumber){
      input.value = certificateNumber.trim();
      verifyCertificate();
    }
  });

  closeModalButton.addEventListener("click", closePreview);
  previewModal.addEventListener("click", event => {
    if(event.target === previewModal) closePreview();
  });
  zoomInButton.addEventListener("click", () => setZoom(currentZoom + .15));
  zoomOutButton.addEventListener("click", () => setZoom(currentZoom - .15));
  resetZoomButton.addEventListener("click", () => setZoom(1));

  function setLoading(active){
    verifyButton.disabled = active;
    loadingOverlay.classList.toggle("show",active);
    loadingOverlay.setAttribute("aria-hidden",String(!active));
  }

  function detail(icon,label,value){
    return `
      <div class="detail-item">
        <span class="detail-dot">${icon}</span>
        <div><small>${U.escapeHtml(label)}</small><strong>${U.safeValue(value)}</strong></div>
      </div>
    `;
  }

  function renderSuccess(certificate, queryNumber){
    currentCertificate = certificate;

    const expiry = certificate["Expiry Date"] || certificate["Expirty Date"] || "";
    const status = certificate["Status"] || "Unknown";
    const url = U.directUrl(queryNumber);

    resultArea.innerHTML = `
      <div class="result-grid">
        <section class="verification-column">
          <div class="success-banner">
            <div class="success-left">
              <div class="success-icon">
                <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>
              </div>
              <div>
                <h2>Certificate Verified Successfully</h2>
                <p>This certificate is present in the official Highfield Egypt database.</p>
              </div>
            </div>
            <span class="status-pill ${U.statusClass(status)}">${U.safeValue(status)}</span>
          </div>

          <div class="certificate-panel" id="certificatePreviewTrigger">
            ${HighfieldCertificate.render(certificate)}
          </div>

          <div class="action-bar">
            <button class="action-button" id="downloadPdfButton" type="button">Download PDF</button>
            <button class="action-button" id="printButton" type="button">Print Certificate</button>
            <button class="action-button" id="shareButton" type="button">Share Certificate</button>
          </div>
        </section>

        <aside class="side-column">
          <section class="side-card">
            <h3>Certificate Details</h3>
            <div class="detail-list">
              ${detail("№","Certificate Number",certificate["Certificate No"])}
              ${detail("◇","Accreditation Code",certificate["Accreditation Code"])}
              ${detail("▣","Program",certificate["Program Name"])}
              ${detail("◷","Period",`${certificate["Issue Date"] || "—"} to ${expiry || "—"}`)}
              ${detail("✦","Training Hours",certificate["Training Hours"])}
              ${detail("●","CPD Points",certificate["CPD Points"])}
              ${detail("H","Provider",certificate["Provider"])}
              ${detail("✓","Status",status)}
            </div>
          </section>

          <section class="side-card">
            <h3>Verify this Certificate</h3>
            <div class="qr-frame"><div id="qrCode"></div></div>
            <p class="qr-caption">Scan the QR code to open the official verification record.</p>
            <button class="copy-button" id="copyLinkButton" type="button">Copy Verification Link</button>
          </section>
        </aside>
      </div>
    `;

    HighfieldQR.create(document.getElementById("qrCode"),url);

    document.getElementById("certificatePreviewTrigger").addEventListener("click",openPreview);
    document.getElementById("downloadPdfButton").addEventListener("click",() => HighfieldPDF.download(certificate));
    document.getElementById("printButton").addEventListener("click",() => window.print());
    document.getElementById("shareButton").addEventListener("click",() => U.share({
      title:"Highfield Egypt Certificate",
      text:`Verify certificate ${certificate["Certificate No"] || queryNumber}`,
      url
    }));
    document.getElementById("copyLinkButton").addEventListener("click",async event => {
      await U.copyText(url);
      event.currentTarget.textContent = "Link Copied";
      setTimeout(() => event.currentTarget.textContent = "Copy Verification Link",1400);
    });

    history.replaceState({}, "", location.pathname + "?certificate=" + encodeURIComponent(queryNumber));
  }

  function renderNotFound(queryNumber){
    currentCertificate = null;
    const message = encodeURIComponent(
      `Hello Highfield Egypt, I searched for certificate number ${queryNumber}, but it was not found. I would like to ask about the certificate or apply for an upcoming program.`
    );

    resultArea.innerHTML = `
      <section class="not-found-card">
        <div class="not-found-left">
          <div class="not-found-icon">×</div>
          <h2>Certificate Not Found</h2>
          <p>We could not locate a certificate matching <strong>${U.escapeHtml(queryNumber)}</strong>.</p>

          <div class="not-found-actions">
            <a class="whatsapp-button" href="https://wa.me/${C.whatsappNumber}?text=${message}" target="_blank" rel="noopener">
              Contact us on WhatsApp<br>${C.whatsappDisplay}
            </a>
            <a class="programs-button" href="${C.programsUrl}" target="_blank" rel="noopener">Explore Our Programs</a>
            <button class="search-again-button" id="searchAgainButton" type="button">Search Again</button>
          </div>
        </div>

        <div class="not-found-right">
          <div>
            <h3>It may simply be too early.</h3>
            <p>The certificate may not have been issued yet, or the number entered may be incorrect.</p>
            <div class="early-message">
              If you recently completed the program, contact our team so we can assist you.
              If you have not joined yet, you can ask about the next available intake and apply for the program.
            </div>
          </div>
        </div>
      </section>
    `;

    document.getElementById("searchAgainButton").addEventListener("click",() => {
      resultArea.innerHTML = "";
      input.focus();
      window.scrollTo({top:0,behavior:"smooth"});
    });
  }

  function renderServiceError(){
    resultArea.innerHTML = `
      <section class="not-found-card">
        <div class="not-found-left">
          <div class="not-found-icon">!</div>
          <h2>Verification Unavailable</h2>
          <p>The verification service is temporarily unavailable.</p>
        </div>
        <div class="not-found-right">
          <div>
            <h3>Please try again shortly.</h3>
            <p>We could not connect to the official database at this moment.</p>
          </div>
        </div>
      </section>
    `;
  }

  async function verifyCertificate(){
    const queryNumber = input.value.trim();

    if(!queryNumber){
      input.focus();
      input.setAttribute("aria-invalid","true");
      return;
    }

    input.removeAttribute("aria-invalid");
    resultArea.innerHTML = "";
    setLoading(true);

    try{
      const response = await fetch(C.apiUrl + "?certificate=" + encodeURIComponent(queryNumber),{
        method:"GET",
        cache:"no-store"
      });

      if(!response.ok) throw new Error("API request failed");
      const payload = await response.json();

      if(payload.success && payload.certificate){
        renderSuccess(payload.certificate,queryNumber);
      }else{
        renderNotFound(queryNumber);
      }
    }catch(error){
      console.error(error);
      renderServiceError();
    }finally{
      setLoading(false);
    }
  }

  function openPreview(){
    if(!currentCertificate) return;
    modalCanvas.innerHTML = HighfieldCertificate.render(currentCertificate,"modalCertificate");
    currentZoom = 1;
    applyZoom();
    previewModal.classList.add("show");
    previewModal.setAttribute("aria-hidden","false");
  }

  function closePreview(){
    previewModal.classList.remove("show");
    previewModal.setAttribute("aria-hidden","true");
  }

  function setZoom(value){
    currentZoom = Math.min(2.2,Math.max(.6,value));
    applyZoom();
  }

  function applyZoom(){
    const certificate = document.getElementById("modalCertificate");
    if(!certificate) return;
    certificate.style.transform = `scale(${currentZoom})`;
    resetZoomButton.textContent = `${Math.round(currentZoom*100)}%`;
  }
})();
