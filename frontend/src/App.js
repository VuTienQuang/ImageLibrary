import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FaTrash } from 'react-icons/fa';
import Masonry from 'react-masonry-css';
import './styles.scss';
import './reset.css';
import TabBar from './components/TabBar';

function App() {
  const [images, setImages] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [activeImageId, setActiveImageId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const fileInputRef = useRef(null);

  const isSensitive = label => ['Hentai', 'Porn', 'Sexy'].includes(label);

  useEffect(() => {
    loadAllImages();
  }, []);

  // Load all images from server
  const loadAllImages = () => {
    axios.get('http://localhost:5000/images')
      .then(res => setImages(res.data))
      .catch(err => console.error('❌ Lỗi tải ảnh:', err));
  };

  const handleUploadClick = () => {
    setSearchMode(false);
    setSearchResults([]);
    fileInputRef.current.click();
  };

  const handleSearchClick = () => {
    setSearchMode(true);
    setSearchResults([]); // Reset previous search results
    fileInputRef.current.click();
  };

  const handleResetClick = () => {
    // Reset to library view
    setSearchResults([]);
    setSearchMode(false);
    loadAllImages(); // Reload all images
  };

  const handleFileChange = async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (searchMode) {
      // Search by single image
      setSearchLoading(true);
      const file = files[0];
      const formData = new FormData();
      formData.append('image', file);
      try {
        const res = await axios.post('http://localhost:5000/search', formData);
        setSearchResults(res.data);
      } catch (err) {
        console.error('❌ Lỗi tìm kiếm ảnh:', err);
      } finally {
        setSearchLoading(false);
      }
    } else {
      // Upload multiple images
      setLoading(true);
      try {
        const uploaded = await Promise.all(
          files.map(file => {
            const formData = new FormData();
            formData.append('image', file);
            return axios.post('http://localhost:5000/upload', formData).then(r => r.data);
          })
        );
        setImages(prev => [...prev, ...uploaded]);
      } catch (err) {
        console.error('❌ Lỗi upload nhiều ảnh:', err);
      } finally {
        setLoading(false);
      }
    }
    e.target.value = '';
  };

  const handleThumbnailClick = img => {
    setActiveImageId(img._id || img.id);
    setSelectedImageUrl(`http://localhost:5000${img.imageUrl}`);
  };

  const handleOverlayClick = () => {
    setSelectedImageUrl(null);
    setActiveImageId(null);
  };

  const handleDeleteImage = async id => {
    if (!window.confirm('Bạn có chắc muốn xóa ảnh này?')) return;
    try {
      await axios.delete(`http://localhost:5000/images/${id}`);
      setImages(prev => prev.filter(img => img._id !== id));
      setSearchResults(prev => prev.filter(item => item.id !== id));
      if (activeImageId === id) handleOverlayClick();
    } catch (err) {
      console.error('❌ Lỗi khi xóa ảnh:', err);
    }
  };

  const breakpointColumns = { default: 3, 992: 3, 768: 2, 480: 1 };

  return (
    <div className="container">
      <TabBar
        onUploadClick={handleUploadClick}
        onSearchClick={handleSearchClick}
        loading={loading}
        searchLoading={searchLoading}
        resetClick={handleResetClick} // Button to reset view to library
      />

      <input
        type="file"
        accept="image/*"
        multiple={!searchMode}
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Display search results at the top if searchMode is active */}
      {searchMode && searchResults.length > 0 && (
        <div className="search-results">
          <h2>Kết quả tìm kiếm</h2>
          <Masonry
            breakpointCols={breakpointColumns}
            className="gallery"
            columnClassName="gallery-column"
          >
            {searchResults.map(item => (
              <div key={item.id} className="image-item">
                <img
                  src={`http://localhost:5000${item.imageUrl}`}
                  alt="search-result"
                  className="thumbnail"
                  onClick={() => handleThumbnailClick(item)}
                />
                <p>Độ giống: {(item.score * 100).toFixed(2)}%</p>
              </div>
            ))}
          </Masonry>
        </div>
      )}

      {/* If not searching, display all images */}
      {!searchMode && (
        <Masonry
          breakpointCols={breakpointColumns}
          className="gallery"
          columnClassName="gallery-column"
        >
          {images.map(img => {
            const url = `http://localhost:5000${img.imageUrl}`;
            const blurClass = isSensitive(img.nsfw.label || img.nsfw.probability * 100 >90) ? 'blur' : '';
            return (
              <div key={img._id} className="image-item">
                <img
                  src={url}
                  alt="uploaded"
                  className={`thumbnail ${blurClass}`}
                  onClick={() => handleThumbnailClick(img)}
                />
                <p>{img.nsfw.label} ({(img.nsfw.probability * 100).toFixed(2)}%)</p>
              </div>
            );
          })}
        </Masonry>
      )}

      {selectedImageUrl && (
        <div className="overlay" onClick={handleOverlayClick}>
          <button
            className="btn-overlay-delete"
            onClick={e => { e.stopPropagation(); handleDeleteImage(activeImageId); }}
          >
            <FaTrash size={60} color="white" />
          </button>
          <img
            src={selectedImageUrl}
            alt="full"
            className="full-image"
          />
        </div>
      )}
    </div>
  );
}

export default App;
