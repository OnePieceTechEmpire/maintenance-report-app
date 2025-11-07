// lib/image-metadata-overlay.ts
interface MetadataOptions {
  timestamp: string;
  location: string;
  date: string;
  additionalInfo?: string;
}

export async function addMetadataOverlay(
  file: File,
  metadata: MetadataOptions
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Match canvas to image size
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Dynamic sizing
      const baseSize = Math.min(img.width, img.height);
      const overlayHeight = Math.max(baseSize * 0.18, 60);
      const overlayPadding = Math.max(baseSize * 0.025, 10);
      const fontSize = Math.max(baseSize * 0.024, 12);
      const lineHeight = fontSize * 1.5;

      // Gradient overlay background
      const gradient = ctx.createLinearGradient(
        0,
        canvas.height - overlayHeight - overlayPadding,
        0,
        canvas.height
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = gradient;
      ctx.fillRect(
        0,
        canvas.height - overlayHeight - overlayPadding,
        canvas.width,
        overlayHeight + overlayPadding
      );

      // Text styling
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'white';
      ctx.font = `600 ${fontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;

      const textX = overlayPadding * 1.5;
      const maxTextWidth = canvas.width - overlayPadding * 3;
      let textY = canvas.height - overlayHeight + overlayPadding * 0.8;

      // Wrap text helper
      const wrapText = (
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number
      ) => {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line.trim(), x, currentY);
            line = words[i] + ' ';
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), x, currentY);
        return currentY + lineHeight;
      };

      // Location (bold)
      ctx.font = `600 ${fontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
      textY = wrapText(metadata.location, textX, textY, maxTextWidth, lineHeight);

      // Date/time (lighter)
      ctx.font = `400 ${fontSize * 0.95}px "Inter", "Helvetica Neue", Arial, sans-serif`;
      const datetimeText = `${metadata.date}   |   ${metadata.timestamp}`;
      textY = wrapText(datetimeText, textX, textY, maxTextWidth, lineHeight);

      // Convert to file
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob conversion failed'));
            return;
          }

          const newFileName =
            file.name.replace(/\.[^/.]+$/, '') + '_metadata.jpg';
          const newFile = new File([blob], newFileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          console.log('✅ Metadata overlay applied (clean design)');
          resolve(newFile);
        },
        'image/jpeg',
        0.9
      );
    };

    img.onerror = () => reject(new Error('Failed to load image for overlay'));
    img.src = URL.createObjectURL(file);
  });
}

// Helper to get current location (optional)
// lib/location-utils.ts
export async function getCurrentLocation(): Promise<{ 
  location: string; 
  coordinates?: { lat: number; lng: number } 
}> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ location: 'Lokasi tidak tersedia' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          // Try to get place name using reverse geocoding
          const placeName = await reverseGeocode(latitude, longitude)
          resolve({ 
            location: placeName,
            coordinates: { lat: latitude, lng: longitude }
          })
        } catch (error) {
          // Fallback to coordinates if reverse geocode fails
          resolve({ 
            location: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
            coordinates: { lat: latitude, lng: longitude }
          })
        }
      },
      (error) => {
        // Handle location errors
        let errorMessage = 'Lokasi tidak dapat diakses'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Akses lokasi ditolak'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Maklumat lokasi tidak tersedia'
            break
          case error.TIMEOUT:
            errorMessage = 'Permintaan lokasi tamat masa'
            break
        }
        resolve({ location: errorMessage })
      },
      { 
        timeout: 10000,
        enableHighAccuracy: true 
      }
    )
  })
}

// Reverse geocoding to get place name
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // Method 1: Using browser's built-in Geocoding API (if available)
    if ('geocode' in navigator) {
      // @ts-ignore - This API is experimental but works in some browsers
      const results = await navigator.geocode({
        location: { lat, lng }
      })
      if (results?.[0]?.formattedAddress) {
        return extractMalaysiaLocation(results[0].formattedAddress)
      }
    }

    // Method 2: Using OpenStreetMap Nominatim (free, no API key needed)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    )
    
    if (!response.ok) throw new Error('Geocoding failed')
    
    const data = await response.json()
    
    if (data.display_name) {
      return extractMalaysiaLocation(data.display_name)
    }
    
    throw new Error('No location data')
    
  } catch (error) {
    console.error('Reverse geocoding failed:', error)
    throw error
  }
}

// Extract relevant parts for Malaysia locations
function extractMalaysiaLocation(fullAddress: string): string {
  const address = fullAddress.split(',').map(part => part.trim())
  
  // Look for common Malaysia location patterns
  const relevantParts = address.slice(0, 3) // Take first 3 parts (usually most relevant)
  
  // Filter out generic terms and keep specific location names
  const filtered = relevantParts.filter(part => 
    !part.match(/^(malaysia|jalan|lorong|persiaran|taman)$/i) &&
    part.length > 3 // Remove very short parts
  )
  
  return filtered.join(', ') || fullAddress.split(',')[0]
}