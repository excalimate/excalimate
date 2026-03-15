import { Button } from '../common';
import { ImportUrlModal } from './ImportUrlModal';
import { useFileOperations } from './useFileOperations';
import { useShareOperations } from './useShareOperations';

export function FileControls() {
  const { handleNew, handleOpen, handleSave, handleImportFile, handleLoadCheckpoint } =
    useFileOperations();
  const {
    loading,
    handleShare,
    showUrlModal,
    setShowUrlModal,
    url,
    setUrl,
    handleImportUrl,
  } = useShareOperations();

  return (
    <>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" onClick={handleNew}>
          New
        </Button>
        <Button variant="ghost" size="sm" onClick={handleOpen}>
          Open
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSave}>
          Save
        </Button>
        <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
        <Button variant="ghost" size="sm" onClick={handleImportFile}>
          Import
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLoadCheckpoint}>
          MCP
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowUrlModal(true)}>
          URL
        </Button>
        <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
        <Button variant="ghost" size="sm" onClick={handleShare}>
          🔒 Share
        </Button>
      </div>

      {showUrlModal && (
        <ImportUrlModal
          isOpen={showUrlModal}
          url={url}
          loading={loading}
          onUrlChange={setUrl}
          onImport={handleImportUrl}
          onClose={() => {
            setShowUrlModal(false);
            setUrl('');
          }}
        />
      )}
    </>
  );
}
