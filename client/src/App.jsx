import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [files, setFiles] = useState({
    subtitles: null,
    videoPath: null,
    audioPath: null
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!files.subtitles || !files.videoPath) {
      setError('Subtitle and video files are required')
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
        videoPath: null,
        audioPath: null
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
          <label htmlFor="videoPath">Video File:</label>
          <input
            type="file"
            id="videoPath"
            name="videoPath"
            accept="video/*"
            onChange={handleFileChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="audioPath">Audio File (optional):</label>
          <input
            type="file"
            id="audioPath"
            name="audioPath"
            accept="audio/*"
            onChange={handleFileChange}
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
