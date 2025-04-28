// src/components/TabBar.js
import React from 'react';

export default function TabBar({ onUploadClick, onSearchClick, loading, searchLoading , resetClick }) {
  return (
    <header className="tab-bar">
      <h1 className="tab-bar__title" onClick={resetClick} >Thư viện ảnh</h1>
      
      <div className="tab-bar__actions">
        <button
          className="btn btn-upload"
          onClick={onUploadClick}
          disabled={loading}
        >
          {loading ? '⏳ Đang tải...' : '➕ Thêm ảnh'}
        </button>
        <button
          className="btn btn-search"
          onClick={onSearchClick}
          disabled={searchLoading}
        >
          {searchLoading ? '🔎 Đang tìm...' : '🔍 Tìm kiếm theo ảnh'}
        </button>
      </div>
    </header>
  );
}
