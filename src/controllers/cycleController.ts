import fs from "fs";
import path from "path";
import { supabase } from "@/lib/supabaseClient";
import { loadFleet35, findCycle, saveFleet35, ManagedCycle } from "@/lib/fleetStore";
import { CycleModel } from "@/models/types";

const CUSTOM_CYCLES_FILE = path.join(process.cwd(), ".data", "custom_cycles.json");

function loadCustomCycles(): Record<string, CycleModel> {
  try {
    if (fs.existsSync(CUSTOM_CYCLES_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOM_CYCLES_FILE, "utf-8"));
    }
  } catch (e) {}
  return {};
}

function saveCustomCycles(map: Record<string, CycleModel>) {
  try {
    const dir = path.join(process.cwd(), ".data");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CUSTOM_CYCLES_FILE, JSON.stringify(map, null, 2), "utf-8");
  } catch (e) {}
}

export class CycleController {
  /**
   * Get all cycles with optional filtering
   */
  static async getAllCycles(filters?: { category?: string; status?: string }): Promise<CycleModel[]> {
    try {
      let query = supabase.from("cycles").select("*");
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          series: d.series || "Campus Standard Fleet",
          modelCode: d.model_code || d.modelCode,
          category: d.category,
          dockNumber: d.dock_number || d.dockNumber,
          isMaintenance: d.is_maintenance ?? d.isMaintenance ?? false,
          maintenanceReason: d.maintenance_reason || d.maintenanceReason,
          hourlyRate: Number(d.hourly_rate || d.hourlyRate || 25),
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    } catch (e) {
      // Fall through to in-memory store
    }

    let fleet: ManagedCycle[] = loadFleet35();
    if (filters?.category && filters.category !== "ALL") {
      fleet = fleet.filter((c: ManagedCycle) => c.category === filters.category);
    }
    if (filters?.status && filters.status !== "ALL") {
      fleet = fleet.filter((c: ManagedCycle) => c.status === filters.status);
    }
    const fleetModels: CycleModel[] = fleet.map((c: ManagedCycle) => ({
      id: c.id,
      name: c.name,
      series: "Campus Standard Fleet",
      modelCode: c.modelCode,
      category: c.category,
      categoryLabel: c.categoryLabel,
      dockNumber: c.currentStandName || "Sports Complex Stand",
      isMaintenance: c.isMaintenance,
      maintenanceReason: c.maintenanceReason,
      hourlyRate: c.hourlyRate,
      condition: c.condition,
      conditionType: c.conditionType,
    }));

    // Include custom created cycles
    const custom = loadCustomCycles();
    for (const c of Object.values(custom)) {
      if (filters?.category && c.category !== filters.category) continue;
      fleetModels.push(c);
    }

    return fleetModels;
  }

  /**
   * Get cycle by ID
   */
  static async getCycleById(id: string): Promise<CycleModel | null> {
    const custom = loadCustomCycles();
    if (custom[id]) {
      return custom[id];
    }

    try {
      const { data, error } = await supabase.from("cycles").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          series: data.series || "Campus Standard Fleet",
          modelCode: data.model_code,
          category: data.category,
          dockNumber: data.dock_number,
          isMaintenance: data.is_maintenance,
          maintenanceReason: data.maintenance_reason,
          hourlyRate: Number(data.hourly_rate || 25),
        };
      }
    } catch (e) {}

    const c = findCycle(id);
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      series: "Campus Standard Fleet",
      modelCode: c.modelCode,
      category: c.category,
      categoryLabel: c.categoryLabel,
      dockNumber: c.currentStandName || "Sports Complex Stand",
      isMaintenance: c.isMaintenance,
      maintenanceReason: c.maintenanceReason,
      hourlyRate: c.hourlyRate,
      condition: c.condition,
      conditionType: c.conditionType,
    };
  }

  /**
   * Create a new cycle
   */
  static async createCycle(data: Partial<CycleModel>): Promise<{ success: boolean; cycle?: CycleModel; error?: string }> {
    const newCycle: CycleModel = {
      id: data.id || `CC-${Math.floor(100 + Math.random() * 900)}`,
      name: data.name || "Conventional Campus Cycle",
      series: data.series || "Campus Standard Fleet",
      modelCode: data.modelCode || `CC-M${Math.floor(100 + Math.random() * 900)}`,
      category: data.category || "city",
      dockNumber: data.dockNumber || "Bay 01",
      isMaintenance: data.isMaintenance ?? false,
      maintenanceReason: data.maintenanceReason || null,
      hourlyRate: data.hourlyRate || 25.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const custom = loadCustomCycles();
    custom[newCycle.id] = newCycle;
    saveCustomCycles(custom);

    try {
      await supabase.from("cycles").insert([
        {
          id: newCycle.id,
          name: newCycle.name,
          series: newCycle.series,
          model_code: newCycle.modelCode,
          category: newCycle.category,
          dock_number: newCycle.dockNumber,
          is_maintenance: newCycle.isMaintenance,
          maintenance_reason: newCycle.maintenanceReason,
          hourly_rate: newCycle.hourlyRate,
        },
      ]);
    } catch (e) {}

    return { success: true, cycle: newCycle };
  }

  /**
   * Update an existing cycle
   */
  static async updateCycle(id: string, updates: Partial<CycleModel>): Promise<{ success: boolean; cycle?: CycleModel; error?: string }> {
    const custom = loadCustomCycles();
    if (custom[id]) {
      const updated = { ...custom[id], ...updates, updatedAt: new Date().toISOString() };
      custom[id] = updated;
      saveCustomCycles(custom);
      return { success: true, cycle: updated };
    }

    try {
      await supabase
        .from("cycles")
        .update({
          ...(updates.name && { name: updates.name }),
          ...(updates.isMaintenance !== undefined && { is_maintenance: updates.isMaintenance }),
          ...(updates.maintenanceReason !== undefined && { maintenance_reason: updates.maintenanceReason }),
          ...(updates.dockNumber && { dock_number: updates.dockNumber }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    } catch (e) {}

    const cycle = findCycle(id);
    if (!cycle) {
      return { success: false, error: `Cycle ${id} not found.` };
    }

    if (updates.isMaintenance !== undefined) {
      cycle.isMaintenance = updates.isMaintenance;
      cycle.status = updates.isMaintenance ? "MAINTENANCE" : "AVAILABLE";
    }
    if (updates.maintenanceReason !== undefined) {
      cycle.maintenanceReason = updates.maintenanceReason || undefined;
    }

    const fleet = loadFleet35();
    const idx = fleet.findIndex((c) => c.id === id);
    if (idx !== -1) {
      fleet[idx] = cycle;
      saveFleet35(fleet);
    }

    return {
      success: true,
      cycle: {
        id: cycle.id,
        name: cycle.name,
        series: "Campus Standard Fleet",
        modelCode: cycle.modelCode,
        category: cycle.category,
        dockNumber: cycle.currentStandName || "Sports Complex Stand",
        isMaintenance: cycle.isMaintenance,
        maintenanceReason: cycle.maintenanceReason,
        hourlyRate: cycle.hourlyRate,
      },
    };
  }

  /**
   * Delete a cycle
   */
  static async deleteCycle(id: string): Promise<{ success: boolean; message: string }> {
    const custom = loadCustomCycles();
    if (custom[id]) {
      delete custom[id];
      saveCustomCycles(custom);
    }

    try {
      await supabase.from("cycles").delete().eq("id", id);
    } catch (e) {}

    return { success: true, message: `Cycle ${id} removed.` };
  }
}
