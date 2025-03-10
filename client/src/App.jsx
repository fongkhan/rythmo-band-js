import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [files, setFiles] = useState({
    subtitles: null,
    videoPath: '',
    audioPath: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target
    setFiles(prev => ({
      ...prev,
      [name]: fileList[0]
    }))
    setError('')
  }

  const handlePathChange = (e) => {
    const { name, value } = e.target
    setFiles(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!files.subtitles || !files.videoPath) {
      setError('Subtitle file and video path are required')
      return
    }

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('subtitles', files.subtitles)
    formData.append('videoPath', files.videoPath)
    if (files.audioPath) {
      formData.append('audioPath', files.audioPath)
    }

    try {
      const response = await axios.post('/convert', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob'
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'converted.detx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      // Reset form
      setFiles({
        subtitles: null,
        videoPath: '',
        audioPath: ''
      })
      e.target.reset()
    } catch (err) {
      console.error('Conversion error:', err)
      setError(err.response?.data || 'Error converting file')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Subtitle to DETX Converter</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="subtitles">Subtitle File (CSV/TXT):</label>
          <input
            type="file"
            id="subtitles"
            name="subtitles"
            accept=".csv,.txt"
            onChange={handleFileChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="videoPath">Video File Path:</label>
          <input
            type="text"
            id="videoPath"
            name="videoPath"
            value={files.videoPath}
            onChange={handlePathChange}
            placeholder="Enter the path to your video file"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="audioPath">Audio File Path (optional):</label>
          <input
            type="text"
            id="audioPath"
            name="audioPath"
            value={files.audioPath}
            onChange={handlePathChange}
            placeholder="Enter the path to your audio file (optional)"
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Converting...' : 'Convert'}
        </button>
      </form>
    </div>
  )
}

export default App
