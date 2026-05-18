export interface HybridMetric {
  operation: 'read' | 'write' | 'detect_drift';
  entity: string;
  entityId?: string;
  source?: 'pg' | 'fs' | 'merged';
  latencyMs?: string | number;
  success: boolean;
  reason?: string;
  driftKeys?: string[];
}

// In-memory stats for tracking migration completion
const migrationStats = {
  sqlReads: 0,
  sqlReadFailures: 0,
  fsReadFallbacks: 0,
  sqlWrites: 0,
  sqlWriteFailures: 0,
  fsWriteFallbacks: 0,
  driftDetected: 0,
  driftEntities: {} as Record<string, number>,
  staleRecords: 0,
  firebaseOnlyDependencies: new Set<string>()
};

export const HybridDiagnostics = {
  logRead(metric: Omit<HybridMetric, 'operation'>) {
    if (metric.source === 'pg') {
      if (metric.success) {
        migrationStats.sqlReads++;
      } else {
        migrationStats.sqlReadFailures++;
      }
    }
    
    if (!metric.success || metric.source === 'fs') {
      if (metric.source === 'fs') {
        migrationStats.fsReadFallbacks++;
      }
      console.warn(`[Hybrid Diagnostics] Read Fallback Activated | Entity: ${metric.entity} | Query: ${metric.entityId} | Latency: ${metric.latencyMs}ms | Reason: ${metric.reason}`);
    } else {
      // Only log slow queries or suppress to reduce noise
      const latencyNum = Number(metric.latencyMs);
      if (latencyNum > 1000) {
        console.warn(`[Hybrid Diagnostics] Slow SQL Read | Entity: ${metric.entity} | Query: ${metric.entityId} | Latency: ${metric.latencyMs}ms`);
      }
    }
  },

  logWrite(metric: Omit<HybridMetric, 'operation'>) {
    if (metric.source === 'pg' || !metric.source) { // Assuming pg is default now
      if (metric.success) {
        migrationStats.sqlWrites++;
      } else {
        migrationStats.sqlWriteFailures++;
      }
    }
    
    if (!metric.success) {
      console.warn(`[Hybrid Diagnostics] SQL Write Failed | Entity: ${metric.entity} | ID: ${metric.entityId} | Reason: ${metric.reason}`);
    }
  },

  logDrift(entity: string, entityId: string, driftKeys: string[]) {
    if (driftKeys.length > 0) {
      migrationStats.driftDetected++;
      migrationStats.driftEntities[`${entity}:${entityId}`] = (migrationStats.driftEntities[`${entity}:${entityId}`] || 0) + 1;
      
      console.warn(`[Hybrid Diagnostics] Drift Detected | Entity: ${entity} | ID: ${entityId} | Keys: ${driftKeys.join(', ')}`);
    } else {
      // we can track successful syncs if we want, but for now just missing
    }
  },
  
  logFirebaseDependency(funcName: string) {
    migrationStats.firebaseOnlyDependencies.add(funcName);
    console.warn(`[Hybrid Diagnostics] Firebase-only dependency invoked: ${funcName}`);
  },

  logStaleRecord(entity: string, id: string) {
    migrationStats.staleRecords++;
    console.warn(`[Hybrid Diagnostics] Stale Record Detected in SQL | Entity: ${entity} | ID: ${id}`);
  },

  getMigrationStats() {
    return {
      ...migrationStats,
      firebaseDependencies: Array.from(migrationStats.firebaseOnlyDependencies)
    };
  }
};

// Expose globally for diagnostics and start periodic telemetry
if (typeof window !== 'undefined') {
  (window as any).HybridDiagnostics = HybridDiagnostics;
  
  setInterval(() => {
    const stats = HybridDiagnostics.getMigrationStats();
    if (stats.sqlReadFailures > 0 || stats.fsReadFallbacks > 0 || stats.driftDetected > 0 || stats.staleRecords > 0) {
      console.info('[Hybrid Diagnostics] Periodic Telemetry Report:', stats);
    }
  }, 30000); // 30s for faster visibility during active use
}

export async function pgFetch(url: string, options: any = {}, retries = 2) {
  let lastError: any;
  const start = performance.now();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeoutMs = 2500 * (attempt + 1); // Increase timeout on retry
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const latency = (performance.now() - start).toFixed(1);
      
      if (!response.ok) {
        let errText = `Status ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson.error) errText = errJson.error;
        } catch (e) {}
        
        // Don't retry on client errors (4xx) except 429
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(errText);
        }
        
        throw new Error(errText);
      }
      
      const data = await response.json();
      return { data, latency, success: true };
    } catch (error: any) {
      lastError = error;
      // If it's a client error (not timeout/network/5xx), break immediately
      if (error.name !== 'AbortError' && !(error.message && error.message.startsWith('Status 5'))) {
         // Continue retry mostly for AbortError (Timeout) or 5xx/Network errors
      }
      
      if (attempt < retries) {
        // Exponential backoff
        await new Promise(res => setTimeout(res, 200 * Math.pow(2, attempt)));
      }
    } finally {
      clearTimeout(id);
    }
  }

  const latency = (performance.now() - start).toFixed(1);
  const reason = lastError.name === 'AbortError' ? 'Timeout' : (lastError.message || String(lastError));
  throw { reason, latency };
}
