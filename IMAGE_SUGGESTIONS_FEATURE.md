# Image Suggestions Feature Implementation

This document outlines the implementation of the Image Suggestions feature for the Phsar One marketplace platform.

## Overview

The Image Suggestions feature helps sellers upload better quality product images by:

- Recommending essential image types (front, back, close-up, packaging, damage/condition)
- Analyzing image quality (resolution, file size, aspect ratio)
- Providing real-time feedback on image quality
- Displaying progress toward optimal image count
- Guiding sellers toward best practices with helpful suggestions

## Components Created

### 1. **useImageSuggestions Hook** (`src/hooks/useImageSuggestions.ts`)

- Analyzes uploaded images and generates suggestions
- Tracks which image types have been uploaded
- Calculates completion percentage
- Provides warning messages for insufficient image count
- **Key Methods:**
  - `analyzeImages()`: Analyzes current image count and returns analysis result
  - `markImageType()`: Marks an image type as uploaded
  - `resetImageType()`: Removes an image type from uploaded list

### 2. **useImageQualityAnalysis Hook** (`src/hooks/useImageQualityAnalysis.ts`)

- Performs detailed quality analysis on individual images
- Checks resolution, file size, and aspect ratio
- Generates a quality score (0-100)
- Provides specific recommendations for improvement
- **Key Methods:**
  - `analyzeImages()`: Analyzes all images in the array
  - `getImageWarning()`: Returns quality warning for a specific image
  - `getAverageQualityScore()`: Calculates average quality across all images

### 3. **ImageSuggestions Component** (`src/components/sell_components/ImageSuggestions.tsx`)

- Displays image suggestions UI with visual progress bar
- Shows recommended image types with descriptions
- Displays quality warnings for insufficient images
- Provides at-a-glance completion status
- **Props:**
  - `currentImageCount`: Number of images uploaded
  - `recommendedImageCount`: Target number (default: 3)
  - `completionPercentage`: Progress percentage
  - `suggestedImages`: Array of suggested image types
  - `warnings`: Array of quality/quantity warnings

### 4. **ImageQualityFeedback Component** (`src/components/sell_components/ImageQualityFeedback.tsx`)

- Displays detailed quality feedback for individual images
- Shows resolution, file size, and aspect ratio
- Lists improvement recommendations
- Color-coded quality score (red/yellow/green)
- Can be used in a modal or separate view

### 5. **Image Quality Utility** (`src/utils/imageQuality.ts`)

- Core image analysis functions
- Analyzes image dimensions, file size, and aspect ratio
- Calculates quality score based on best practices
- Provides actionable recommendations
- **Key Functions:**
  - `analyzeImageQuality()`: Comprehensive analysis of a single image
  - `getImageQualityWarning()`: Specific warning messages
  - `formatFileSize()`: Human-readable file size formatting

## Integration Points

### PhotoUploadSection Component

The feature is integrated into `PhotoUploadSection.tsx`:

```tsx
const { analysis } = useImageSuggestions(photos.length);

// Rendered within the component:
<ImageSuggestions
  currentImageCount={analysis.currentImageCount}
  recommendedImageCount={analysis.recommendedImageCount}
  completionPercentage={analysis.completionPercentage}
  suggestedImages={analysis.suggestions}
  warnings={analysis.warnings}
/>;
```

## Recommended Image Types

1. **Front View** - Clear frontal view of the product
2. **Back View** - Back or side angles
3. **Close-up** - Detailed close-up of product condition
4. **Packaging** - Original packaging (if applicable)
5. **Damage/Condition** - Any visible damage or defects (if applicable)
6. **Additional Views** - Other helpful angles

## Image Quality Standards

The system evaluates images based on:

| Metric       | Minimum          | Recommended |
| ------------ | ---------------- | ----------- |
| Width        | -                | 800px       |
| Height       | -                | 600px       |
| File Size    | -                | < 5MB       |
| Aspect Ratio | Avoid <0.5 or >2 | 0.75 - 1.33 |

## Quality Score Calculation

- **80-100**: Excellent quality (green)
- **60-79**: Good quality (yellow)
- **0-59**: Needs improvement (red)

Score is reduced by:

- 20 points for low resolution
- 15 points for large file size
- 10 points for extreme aspect ratio

## Internationalization

Translations are provided in:

- `src/i18n/locales/en.json`
- `src/i18n/locales/kh.json`

All strings are prefixed with `sellSection.image_*` for consistency.

## Usage Examples

### Basic Usage in Sell Form

```tsx
import PhotoUploadSection from "@src/components/shared_components/PhotoUploadSection";

<PhotoUploadSection
  photos={draft.photos}
  onUpdatePhotos={(newPhotos) => updateDraft("photos", newPhotos)}
  themeColors={themeColors}
/>;
```

### With Quality Feedback

```tsx
import ImageQualityFeedback from "@src/components/sell_components/ImageQualityFeedback";
import { useImageQualityAnalysis } from "@src/hooks/useImageQualityAnalysis";

const { analysisResults } = useImageQualityAnalysis(photos);

{
  Object.entries(analysisResults).map(([index, metrics]) => (
    <ImageQualityFeedback
      key={index}
      metrics={metrics!}
      imageIndex={parseInt(index)}
    />
  ));
}
```

## Future Enhancements

Potential improvements for future versions:

1. **AI-Powered Detection**: Integrate computer vision to automatically detect image types
2. **Blur Detection**: Analyze image sharpness using ML models
3. **Background Analysis**: Suggest backgrounds or lighting improvements
4. **Image Cropping**: Auto-suggest optimal crop region
5. **Metadata Extraction**: Extract EXIF data for additional insights
6. **User Analytics**: Track which suggestions improve listing performance
7. **A/B Testing**: Test different suggestion strategies

## Performance Considerations

- Image analysis is async and non-blocking
- Results are cached to avoid redundant analysis
- File system operations use Expo's FileSystem API
- Image validation uses React Native's Image.getSize()

## Known Limitations

1. Blur detection is not currently implemented (requires external library)
2. Image type classification is manual - users must specify type
3. Analysis requires actual image files (not network URLs without download)
4. Quality score is based on metadata, not AI vision analysis

## Testing Recommendations

1. Test with various image formats (JPG, PNG, WebP)
2. Test with different aspect ratios
3. Test with low resolution vs high resolution images
4. Test internationalization with both English and Khmer
5. Test on different device sizes
6. Test with network and slow connections

## Files Modified

- `src/components/shared_components/PhotoUploadSection.tsx` - Integrated ImageSuggestions component
- `src/i18n/locales/en.json` - Added English translations
- `src/i18n/locales/kh.json` - Added Khmer translations

## Files Created

- `src/hooks/useImageSuggestions.ts` - Main suggestions logic
- `src/hooks/useImageQualityAnalysis.ts` - Quality analysis hook
- `src/components/sell_components/ImageSuggestions.tsx` - UI component
- `src/components/sell_components/ImageQualityFeedback.tsx` - Feedback component
- `src/utils/imageQuality.ts` - Quality analysis utilities
