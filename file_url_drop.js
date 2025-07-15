document.addEventListener("DOMContentLoaded", function () {
  const attachmentArea = document.querySelector("#compose-attachments");
  const csrfTokenInput = document.querySelector('input[name="_token"]');
  const csrfToken = csrfTokenInput ? csrfTokenInput.value : null;

  if (!csrfToken) {
    console.error("CSRF token not found!");
    return;
  }

  if (attachmentArea) {
    attachmentArea.addEventListener("drop", async function (event) {
      event.preventDefault();

      if (event.dataTransfer.getData("roundcube-uri")) {
        return;
      }

      const droppedFileUrl = event.dataTransfer.getData("text/plain");

      if (!droppedFileUrl) {
        console.error("No data found in drop event.");
        return;
      }

      if (!isValidUrl(droppedFileUrl)) {
        console.log("Valid dropped URL detected:", droppedFileUrl);
        return;
      }

      return fetch("./?_task=mail&_action=plugin.file_url_drop", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `_remote_url=${encodeURIComponent(
          droppedFileUrl
        )}&_token=${encodeURIComponent(csrfToken)}`,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Failed to download remote file.");
          }

          // Convert the response into a Blob
          const blob = await response.blob();
          const filename =
            getFileNameFromContentDisposition(response) || "downloaded-file";

          // Create a File object
          const file = new File([blob], filename, { type: blob.type });

          // Create a DataTransfer to assign the file to an <input type="file">
          const dt = new DataTransfer();
          dt.items.add(file);

          // Create a hidden form and file input
          const form = document.createElement("form");
          form.enctype = "multipart/form-data";
          form.method = "post";
          form.style.display = "none";

          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.name = "_attachments[]";
          fileInput.files = dt.files;

          form.appendChild(fileInput);
          document.body.appendChild(form);

          console.log(form);

          // Trigger Roundcube's upload command
          rcmail.command("send-attachment", form);
        })
        .catch((error) => {
          console.error(error);
          alert("Error occurred while attaching the file.");
        });
    });

    attachmentArea.addEventListener("dragover", function (event) {
      event.preventDefault();
    });

    function isValidUrl(string) {
      try {
        new URL(string);
        return true;
      } catch (_) {
        return false;
      }
    }

    function getFileNameFromContentDisposition(response) {
      const header = response.headers.get("Content-Disposition");

      if (header) {
        // Try to match RFC 5987 format first: filename*=UTF-8''file.txt
        const rfc5987Match = header.match(
          /filename\*=(?:UTF-\d['']*)?([^;\n]+)/i
        );
        if (rfc5987Match) {
          try {
            return decodeURIComponent(
              rfc5987Match[1].trim().replace(/['"]/g, "")
            );
          } catch {
            // fallback if decodeURIComponent fails
            return rfc5987Match[1].trim().replace(/['"]/g, "");
          }
        }

        // Fallback: match normal filename="file.txt"
        const match = header.match(/filename="?([^"]+)"?/i);
        if (match) {
          const filename = match[1].split("?")[0]; // remove any query params
          return filename.trim();
        }
      }

      return "downloaded-file";
    }
  }
});
