/**
 * Virus Scanning Integration using VirusTotal API
 * Scans uploaded images for malware before storage
 */

export interface VirusScanResult {
  clean: boolean
  scanId?: string
  detections?: number
  engines?: number
  status: 'clean' | 'infected' | 'pending' | 'error'
  details?: string
  timestamp: string
}

/**
 * Scan a file for viruses using VirusTotal API
 * @param file - File to scan
 * @param apiKey - VirusTotal API key
 * @returns Scan result
 */
export async function scanFileForViruses(
  file: File | Blob,
  apiKey: string
): Promise<VirusScanResult> {
  if (!apiKey) {
    console.warn('⚠️ VirusTotal API key not configured, skipping virus scan')
    return {
      clean: true,
      status: 'clean',
      details: 'Virus scanning disabled (no API key)',
      timestamp: new Date().toISOString()
    }
  }

  try {
    // Upload file to VirusTotal
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: {
        'x-apikey': apiKey
      },
      body: formData
    })

    if (!uploadResponse.ok) {
      throw new Error(`VirusTotal upload failed: ${uploadResponse.status}`)
    }

    const uploadData = await uploadResponse.json() as { data: { id: string } }
    const scanId = uploadData.data.id

    // Wait a moment for initial scan
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Get scan results
    const analysisResponse = await fetch(
      `https://www.virustotal.com/api/v3/analyses/${scanId}`,
      {
        headers: {
          'x-apikey': apiKey
        }
      }
    )

    if (!analysisResponse.ok) {
      throw new Error(`VirusTotal analysis failed: ${analysisResponse.status}`)
    }

    const analysisData = await analysisResponse.json() as { data: { attributes: { stats: { malicious: number; suspicious: number; harmless: number; undetected: number } } } }
    const stats = analysisData.data.attributes.stats

    // Determine if file is clean
    const malicious = stats.malicious || 0
    const suspicious = stats.suspicious || 0
    const detections = malicious + suspicious
    const engines = stats.harmless + stats.undetected + detections

    const result: VirusScanResult = {
      clean: detections === 0,
      scanId,
      detections,
      engines,
      status: detections > 0 ? 'infected' : 'clean',
      details: `Scanned by ${engines} engines, ${detections} detections`,
      timestamp: new Date().toISOString()
    }

    if (!result.clean) {
      console.error(`🦠 Virus detected! ${detections}/${engines} engines flagged the file`)
    } else {
      console.log(`✅ Virus scan passed: ${detections}/${engines} detections`)
    }

    return result

  } catch (error) {
    console.error('❌ Virus scan error:', error)
    return {
      clean: false,
      status: 'error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Quick file validation without full virus scan
 * Checks for common malware patterns in file headers
 * @param file - File to validate
 * @returns Whether file appears safe
 */
export async function quickFileValidation(
  file: File | Blob
): Promise<boolean> {
  try {
    // Read first 512 bytes for header inspection
    const headerSize = 512
    const buffer = await file.slice(0, headerSize).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Check for valid image headers
    const jpegHeader = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
    const pngHeader = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
    const webpHeader = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50

    const hasValidHeader = jpegHeader || pngHeader || webpHeader

    if (!hasValidHeader) {
      console.warn('⚠️ Invalid image header detected')
      return false
    }

    // Check for executable signatures (should not be in images)
    const hasMZHeader = bytes[0] === 0x4D && bytes[1] === 0x5A // DOS/Windows executable
    const hasELFHeader = bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46 // Linux executable
    const hasMachOHeader = bytes[0] === 0xCF && bytes[1] === 0xFA // macOS executable

    if (hasMZHeader || hasELFHeader || hasMachOHeader) {
      console.error('🚨 Executable file detected in image upload!')
      return false
    }

    return true

  } catch (error) {
    console.error('❌ File validation error:', error)
    return false
  }
}

/**
 * Comprehensive file security check
 * Combines quick validation and virus scanning
 * @param file - File to check
 * @param apiKey - VirusTotal API key (optional)
 * @returns Scan result
 */
export async function performSecurityCheck(
  file: File | Blob,
  apiKey?: string
): Promise<VirusScanResult> {
  // First, quick validation
  const isValidHeader = await quickFileValidation(file)

  if (!isValidHeader) {
    return {
      clean: false,
      status: 'infected',
      details: 'Invalid or suspicious file header detected',
      timestamp: new Date().toISOString()
    }
  }

  // Then, virus scan if API key available
  if (apiKey) {
    return await scanFileForViruses(file, apiKey)
  }

  // No virus scan, but passed header validation
  return {
    clean: true,
    status: 'clean',
    details: 'Passed header validation (full virus scan disabled)',
    timestamp: new Date().toISOString()
  }
}
