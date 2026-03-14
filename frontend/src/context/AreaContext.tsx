import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { areaAPI } from '../services/api';

export interface CurrentArea {
  areaId: string;
  areaName: string;
  center?: [number, number];
  zoom?: number;
}

interface AreaContextType {
  currentArea: CurrentArea | null;
  isInCampus: boolean;
  mode: 'open_world' | 'campus';
  peekOutsideCampus: boolean;
  setMode: (mode: 'open_world' | 'campus') => void;
  setPeekOutsideCampus: (enabled: boolean) => void;
  setLocation: (lat: number, lng: number) => void;
}

const AreaContext = createContext<AreaContextType | undefined>(undefined);

const THROTTLE_MS = 30000; // Check area at most every 30 seconds
const MIN_DISTANCE_METERS = 50; // Re-check if moved at least 50m

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const AreaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentArea, setCurrentArea] = useState<CurrentArea | null>(null);
  const [preferredMode, setPreferredMode] = useState<'open_world' | 'campus'>('open_world');
  const [hasManualModeSelection, setHasManualModeSelection] = useState(false);
  const [peekOutsideCampus, setPeekOutsideCampus] = useState(false);
  const lastCheckRef = useRef<number>(0);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const setLocation = useCallback(async (lat: number, lng: number) => {
    const now = Date.now();
    const lastLoc = lastLocationRef.current;
    const timeSinceCheck = now - lastCheckRef.current;
    const distanceMoved = lastLoc
      ? haversineDistance(lat, lng, lastLoc.lat, lastLoc.lng)
      : Infinity;

    if (timeSinceCheck < THROTTLE_MS && distanceMoved < MIN_DISTANCE_METERS) {
      return;
    }

    lastLocationRef.current = { lat, lng };
    lastCheckRef.current = now;

    try {
      const response = await areaAPI.getCurrent(lat, lng);
      const area = response?.data ?? response;
      const resolvedArea =
        area && typeof area === 'object' && 'areaId' in area ? (area as CurrentArea) : null;
      setCurrentArea(resolvedArea);

      if (!hasManualModeSelection) {
        setPreferredMode(resolvedArea ? 'campus' : 'open_world');
      }
    } catch (error) {
      setCurrentArea(null);
      if (!hasManualModeSelection) {
        setPreferredMode('open_world');
      }
    }
  }, [hasManualModeSelection]);

  const setMode = useCallback((nextMode: 'open_world' | 'campus') => {
    setPreferredMode(nextMode);
    setHasManualModeSelection(true);
  }, []);

  const mode: 'open_world' | 'campus' = preferredMode === 'campus' ? 'campus' : 'open_world';

  const value: AreaContextType = {
    currentArea,
    isInCampus: !!currentArea,
    mode,
    peekOutsideCampus,
    setMode,
    setPeekOutsideCampus,
    setLocation,
  };

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
};

export const useArea = () => {
  const context = useContext(AreaContext);
  if (context === undefined) {
    throw new Error('useArea must be used within an AreaProvider');
  }
  return context;
};
