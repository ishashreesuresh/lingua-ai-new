export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  iconLink?: string;
  webViewLink?: string;
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

/**
 * List files from the user's Google Drive
 */
export async function listDriveFiles(
  accessToken: string,
  searchQuery: string = '',
  pageSize: number = 25
): Promise<DriveFileItem[]> {
  let q = "trashed = false";
  if (searchQuery.trim()) {
    const escaped = searchQuery.replace(/'/g, "\\'");
    q += ` and name contains '${escaped}'`;
  }

  const params = new URLSearchParams({
    q,
    pageSize: pageSize.toString(),
    fields: 'files(id, name, mimeType, modifiedTime, size, iconLink, webViewLink)',
    orderBy: 'modifiedTime desc',
  });

  const response = await fetch(`${DRIVE_API_URL}/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Download text content of a file from Google Drive
 * If it's a native Google Doc, export it as text/plain.
 */
export async function getDriveFileText(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<string> {
  let url = `${DRIVE_API_URL}/files/${fileId}?alt=media`;

  if (mimeType === 'application/vnd.google-apps.document') {
    url = `${DRIVE_API_URL}/files/${fileId}/export?mimeType=text/plain`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to read file from Drive (${response.status}): ${errorText}`);
  }

  return response.text();
}

/**
 * Create a new text or markdown file in Google Drive using multipart upload
 */
export async function uploadDriveTextFile(
  accessToken: string,
  options: {
    fileName: string;
    content: string;
    description?: string;
    mimeType?: string;
  }
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const mimeType = options.mimeType || 'text/plain; charset=utf-8';

  const metadata = {
    name: options.fileName,
    description: options.description || 'Translated with LinguaAI',
    mimeType: options.mimeType || 'text/plain',
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    options.content +
    closeDelimiter;

  const response = await fetch(
    `${DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save file to Drive: ${errorText}`);
  }

  return response.json();
}

/**
 * Delete a file from Google Drive (MUST be confirmed by the user in UI first!)
 */
export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const response = await fetch(`${DRIVE_API_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    throw new Error(`Failed to delete file from Drive: ${errorText}`);
  }
}
