import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
  Dimensions,
  Platform,
  Alert,
  Animated,
  PanResponder,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Compressed rectangle height vs full expanded viewfinder height
const COMPRESSED_HEIGHT = 200;
const EXPANDED_HEIGHT = Math.min(Math.round(SCREEN_HEIGHT * 0.72), 580);
const FRAMING_SIZE = 210;

export const HomeScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // Compressed vs Expanded State
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  // Camera Settings
  const [facing, setFacing] = useState('back');
  const [enableTorch, setEnableTorch] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0); // 0 (1x) to 1 (max zoom)
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Captured Photo
  const [capturedPhotoUri, setCapturedPhotoUri] = useState(null);

  // Shutter Press Animation
  const shutterScale = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Pinch-to-Zoom Refs
  const zoomRef = useRef(0);
  const baseZoomRef = useRef(0);
  const initialDistanceRef = useRef(null);

  // Keep zoomRef in sync with state
  useEffect(() => {
    zoomRef.current = zoomLevel;
  }, [zoomLevel]);

  // Expand / Collapse Viewfinder Handlers
  const expandCamera = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(true);
  };

  const collapseCamera = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(false);
  };

  // PanResponder to handle multi-touch pinch to zoom (when expanded)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => isExpandedRef.current && evt.nativeEvent.touches.length === 2,
      onMoveShouldSetPanResponder: (evt) => isExpandedRef.current && evt.nativeEvent.touches.length === 2,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          initialDistanceRef.current = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          baseZoomRef.current = zoomRef.current;
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2 && initialDistanceRef.current) {
          const currentDistance = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          const ratio = currentDistance / initialDistanceRef.current;
          // Smooth zoom scaling delta
          const delta = (ratio - 1) * 0.45;
          const newZoom = Math.min(Math.max(baseZoomRef.current + delta, 0), 1);
          zoomRef.current = newZoom;
          setZoomLevel(newZoom);
        }
      },
      onPanResponderRelease: () => {
        initialDistanceRef.current = null;
        baseZoomRef.current = zoomRef.current;
      },
      onPanResponderTerminate: () => {
        initialDistanceRef.current = null;
        baseZoomRef.current = zoomRef.current;
      },
    })
  ).current;

  const handleRequestPermission = async () => {
    try {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Camera Permission',
          'Camera permission is required to capture photos directly.'
        );
      }
    } catch (e) {
      console.warn('Error requesting permission:', e);
    }
  };

  const toggleTorch = () => {
    setEnableTorch((prev) => !prev);
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  // Toggle or reset zoom
  const toggleZoom = () => {
    if (zoomLevel > 0) {
      setZoomLevel(0);
      zoomRef.current = 0;
      baseZoomRef.current = 0;
    } else {
      const targetZoom = 0.25; // 2x
      setZoomLevel(targetZoom);
      zoomRef.current = targetZoom;
      baseZoomRef.current = targetZoom;
    }
  };

  const pickFromGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed to select an image.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Gallery pick error:', err);
    }
  };

  const triggerShutterAnimation = () => {
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 0.8,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.timing(shutterScale, {
        toValue: 0.94,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(shutterScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCapture = async () => {
    if (isCapturing) return;

    triggerShutterAnimation();

    if (cameraRef.current && (!permission || permission.granted) && !cameraError) {
      try {
        setIsCapturing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        if (photo?.uri) {
          setCapturedPhotoUri(photo.uri);
          return;
        }
      } catch (err) {
        console.warn('Camera capture fallback:', err);
      } finally {
        setIsCapturing(false);
      }
    }

    // Fallback if camera capture couldn't run directly (e.g. web/simulator)
    try {
      setIsCapturing(true);
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setCapturedPhotoUri(res.assets[0].uri);
      }
    } catch (pickerErr) {
      console.warn('Camera launch fallback error:', pickerErr);
      setCapturedPhotoUri('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhotoUri(null);
  };

  const isCameraPermissionGranted = permission?.granted;

  // Zoom display label (1x, 1.8x, 2.0x, etc.)
  const zoomDisplayLabel =
    zoomLevel <= 0.02
      ? '1x'
      : `${(1 + zoomLevel * 4).toFixed(1)}x`;

  const cameraHeight = isExpanded ? EXPANDED_HEIGHT : COMPRESSED_HEIGHT;

  // Post-Capture State (Preview with Navi-style Retake button ON the preview)
  if (capturedPhotoUri) {
    return (
      <View style={styles.container}>
        <View style={[styles.cameraContainer, { height: EXPANDED_HEIGHT }]}>
          <Image source={{ uri: capturedPhotoUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

          {/* Navi-style Pill Button ON the Preview */}
          <View style={styles.bottomCaptureWrapper} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.capturePill}
              onPress={handleRetake}
              activeOpacity={0.85}
            >
              <View style={styles.capturePillInner}>
                <Ionicons name="camera-reverse-outline" size={18} color={COLORS.white} />
                <Text style={styles.capturePillText}>Retake Photo</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomFill} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Preview Container (Compressed Rectangle -> Animated Full Viewfinder) */}
      <Pressable
        onPress={!isExpanded ? expandCamera : undefined}
        disabled={isExpanded}
        style={styles.cameraWrapper}
      >
        <View
          style={[styles.cameraContainer, { height: cameraHeight }]}
          {...(isExpanded ? panResponder.panHandlers : {})}
        >
          {isCameraPermissionGranted ? (
            <>
              {/* 1. Live Camera View */}
              <CameraView
                key={`camera-${facing}`}
                ref={cameraRef}
                style={styles.cameraPreview}
                pointerEvents="none"
                facing={facing}
                mode="picture"
                active={true}
                enableTorch={enableTorch}
                zoom={zoomLevel}
                onCameraReady={() => {
                  setCameraError(null);
                }}
                onMountError={(e) => {
                  console.warn('Camera preview error:', e);
                  setCameraError(e.message || 'Camera mount error');
                }}
              />

              {isExpanded && (
              /* EXPANDED FULL VIEW CONTROLS */
              <>
                {/* Left Side Controls (Minimize & Camera Reverse - vertically aligned at leftmost) */}
                <View style={styles.leftControlsColumn} pointerEvents="box-none">
                  <TouchableOpacity
                    style={styles.controlIconButton}
                    onPress={collapseCamera}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="contract-outline" size={18} color={COLORS.white} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.controlIconButton}
                    onPress={toggleFacing}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-reverse" size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                {/* Center Framing Brackets [ ] */}
                <View style={styles.framingZone} pointerEvents="none">
                  <View style={[styles.cornerBracket, styles.bracketTopLeft]} />
                  <View style={[styles.cornerBracket, styles.bracketTopRight]} />
                  <View style={[styles.cornerBracket, styles.bracketBottomLeft]} />
                  <View style={[styles.cornerBracket, styles.bracketBottomRight]} />
                </View>

                {/* Right Side Utility Controls (Torch, Zoom, Gallery - Navi style) */}
                <View style={styles.rightControlsColumn} pointerEvents="box-none">
                  <TouchableOpacity
                    style={[
                      styles.controlIconButton,
                      enableTorch && styles.controlIconButtonActive,
                    ]}
                    onPress={toggleTorch}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={enableTorch ? 'flash' : 'flash-outline'}
                      size={18}
                      color={COLORS.white}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.controlIconButton,
                      zoomLevel > 0 && styles.controlIconButtonActive,
                    ]}
                    onPress={toggleZoom}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.zoomText,
                        zoomLevel > 0 && styles.zoomTextActive,
                      ]}
                    >
                      {zoomDisplayLabel}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.controlIconButton}
                    onPress={pickFromGallery}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images-outline" size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                {/* Navi-style Pill Capture Button ON the bottom of Camera Preview */}
                <View style={styles.bottomCaptureWrapper} pointerEvents="box-none">
                  <TouchableOpacity
                    style={styles.capturePill}
                    onPress={handleCapture}
                    activeOpacity={0.85}
                  >
                    <Animated.View
                      style={[
                        styles.capturePillInner,
                        { transform: [{ scale: shutterScale }] },
                      ]}
                    >
                      <Ionicons name="camera" size={20} color={COLORS.white} />
                      <Text style={styles.capturePillText}>Capture Photo</Text>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        ) : (
          /* Light-Mode In-Situ Permission Card */
          <View style={styles.permissionCard}>
            <View style={styles.permissionIconCircle}>
              <Feather name="camera" size={30} color={COLORS.charcoal} />
            </View>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionSubtitle}>
              Grant camera access to point and take photos directly from this screen.
            </Text>

            <TouchableOpacity
              style={styles.permissionPrimaryButton}
              onPress={handleRequestPermission}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
              <Text style={styles.permissionPrimaryButtonText}>Enable Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.permissionSecondaryButton}
              onPress={pickFromGallery}
              activeOpacity={0.7}
            >
              <Ionicons name="image-outline" size={16} color={COLORS.charcoal} />
              <Text style={styles.permissionSecondaryButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Shutter White Flash Animation */}
        <Animated.View
          style={[styles.flashOverlay, { opacity: flashAnim }]}
          pointerEvents="none"
        />
      </View>

    </Pressable>

      {/* Clean white bottom area */}
      <View style={styles.bottomFill} />

      {/* Floating Pill on the bottom border edge - Rendered AFTER bottomFill so it is NEVER cut off */}
      {!isExpanded && (
        <TouchableOpacity
          style={[
            styles.floatingBorderActionWrapper,
            { top: cameraHeight + 8 - 22 },
          ]}
          onPress={expandCamera}
          activeOpacity={0.85}
        >
          <View style={styles.previewButton}>
            <Ionicons name="scan-outline" size={17} color={COLORS.white} />
            <Text style={styles.previewButtonText}>Open Preview</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: 8,
  },

  /* Camera Preview Container (Compressed Rectangle -> Animated Full Viewfinder) */
  cameraWrapper: {
    width: '100%',
    position: 'relative',
  },
  cameraContainer: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },


  /* Left Side Controls (Minimize & Camera Reverse - vertically aligned at leftmost) */
  leftControlsColumn: {
    position: 'absolute',
    top: 16,
    left: 16,
    gap: 12,
    zIndex: 25,
    elevation: 10,
  },

  /* Center Framing Brackets [ ] (Clean 210x210 in expanded preview) */
  framingZone: {
    position: 'absolute',
    top: 125,
    alignSelf: 'center',
    width: FRAMING_SIZE,
    height: FRAMING_SIZE,
    zIndex: 15,
  },
  cornerBracket: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.75,
    shadowRadius: 3,
  },
  bracketTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 8,
  },
  bracketTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 8,
  },
  bracketBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 8,
  },
  bracketBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 8,
  },

  /* Right Side Controls (Torch, Zoom, Gallery - Navi style) */
  rightControlsColumn: {
    position: 'absolute',
    right: 16,
    top: 16,
    gap: 12,
    zIndex: 25,
    elevation: 10,
  },
  controlIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E2328',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
  },
  controlIconButtonActive: {
    backgroundColor: '#4B5563',
    borderColor: '#CBD5E1',
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  zoomText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  zoomTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Navi-Style Pill Capture Button (Pinned neatly at bottom of preview frame) */
  bottomCaptureWrapper: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 15,
  },
  capturePill: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 18,
  },
  capturePillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2328',
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  capturePillText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Preview Button: Floating directly on the bottom border edge of the preview camera frame */
  floatingBorderActionWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 30,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2328',
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  previewButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Bottom Fill (Clean white space below camera) */
  bottomFill: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  /* Shutter White Flash */
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 40,
    elevation: 20,
  },

  /* Light-Mode Permission Card */
  permissionCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  permissionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDEFF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E4E6',
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.charcoal,
    textAlign: 'center',
    marginBottom: 6,
  },
  permissionSubtitle: {
    fontSize: 12,
    color: COLORS.subtext,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: 260,
  },
  permissionPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.charcoal,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
    marginBottom: 8,
  },
  permissionPrimaryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  permissionSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  permissionSecondaryButtonText: {
    color: COLORS.charcoal,
    fontWeight: '600',
    fontSize: 12,
  },
});
