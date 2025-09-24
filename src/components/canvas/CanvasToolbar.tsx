import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CanvasToolSettings, DrawingTool } from '@/types/canvas';
import { 
  Pen, 
  Eraser, 
  Type, 
  MousePointer, 
  Circle, 
  Square,
  Palette,
  Minus,
  Plus
} from 'lucide-react';

interface CanvasToolbarProps {
  toolSettings: CanvasToolSettings;
  onToolChange: (updates: Partial<CanvasToolSettings>) => void;
  canEdit: boolean;
}

const COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
  '#800080', '#008000', '#800000', '#808080'
];

const BRUSH_SIZES = [1, 2, 4, 6, 8, 12, 16, 20];

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  toolSettings,
  onToolChange,
  canEdit
}) => {
  const handleToolSelect = (tool: DrawingTool) => {
    if (!canEdit) return;
    onToolChange({ tool });
  };

  const handleColorSelect = (color: string) => {
    if (!canEdit) return;
    onToolChange({ color });
  };

  const handleWidthChange = (width: number) => {
    if (!canEdit) return;
    onToolChange({ width });
  };

  const handleFontSizeChange = (fontSize: number) => {
    if (!canEdit) return;
    onToolChange({ fontSize });
  };

  if (!canEdit) {
    return (
      <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
        View only mode
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-background border rounded-lg">
      {/* Drawing Tools */}
      <div className="flex items-center gap-1">
        <Button
          variant={toolSettings.tool === 'select' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleToolSelect('select')}
          className="p-2"
        >
          <MousePointer className="h-4 w-4" />
        </Button>
        
        <Button
          variant={toolSettings.tool === 'pen' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleToolSelect('pen')}
          className="p-2"
        >
          <Pen className="h-4 w-4" />
        </Button>
        
        <Button
          variant={toolSettings.tool === 'eraser' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleToolSelect('eraser')}
          className="p-2"
        >
          <Eraser className="h-4 w-4" />
        </Button>
        
        <Button
          variant={toolSettings.tool === 'text' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleToolSelect('text')}
          className="p-2"
        >
          <Type className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Color Palette */}
      <div className="flex items-center gap-1">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-1">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                toolSettings.color === color 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              title={`Select ${color}`}
            />
          ))}
        </div>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Brush Size */}
      {(toolSettings.tool === 'pen' || toolSettings.tool === 'eraser') && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Size:</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWidthChange(Math.max(1, toolSettings.width - 1))}
              className="p-1"
            >
              <Minus className="h-3 w-3" />
            </Button>
            
            <span className="w-8 text-center text-sm font-medium">
              {toolSettings.width}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWidthChange(Math.min(20, toolSettings.width + 1))}
              className="p-1"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => handleWidthChange(size)}
                className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                  toolSettings.width === size 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
                title={`Size ${size}`}
              >
                <div 
                  className="rounded-full bg-current"
                  style={{ 
                    width: Math.max(2, Math.min(size, 12)), 
                    height: Math.max(2, Math.min(size, 12)) 
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Font Size for Text Tool */}
      {toolSettings.tool === 'text' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Font Size:</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFontSizeChange(Math.max(8, toolSettings.fontSize - 2))}
              className="p-1"
            >
              <Minus className="h-3 w-3" />
            </Button>
            
            <span className="w-8 text-center text-sm font-medium">
              {toolSettings.fontSize}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFontSizeChange(Math.min(48, toolSettings.fontSize + 2))}
              className="p-1"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};