/* eslint-disable @typescript-eslint/no-explicit-any */

export interface InventoryItem {
  name: string;
  quantity?: number;
  description?: string;
  value?: number;
}

export interface InventoryUpdate {
  inventory_add?: string[];
  inventory_remove?: string[];
  inventory?: any;
}

/**
 * Smart inventory management functions
 */
export class InventoryManager {
  /**
   * Process inventory updates intelligently
   * @param currentInventory - Current inventory array
   * @param updates - Updates containing inventory_add and/or inventory_remove
   * @returns Processed inventory array
   */
  static processInventoryUpdates(currentInventory: any[], updates: InventoryUpdate): any[] {
    let inventory = Array.isArray(currentInventory) ? [...currentInventory] : [];
    
    // Add new items
    if (updates.inventory_add && Array.isArray(updates.inventory_add)) {
      inventory = [...inventory, ...updates.inventory_add];
    }
    
    // Remove specific items
    if (updates.inventory_remove && Array.isArray(updates.inventory_remove)) {
      inventory = inventory.filter(item => 
        !updates.inventory_remove!.includes(item)
      );
    }
    
    return inventory;
  }

  /**
   * Add items to inventory with quantity tracking
   * @param currentInventory - Current inventory array
   * @param itemsToAdd - Items to add
   * @returns Updated inventory array
   */
  static addItems(currentInventory: any[], itemsToAdd: string[]): any[] {
    const inventory = Array.isArray(currentInventory) ? [...currentInventory] : [];
    return [...inventory, ...itemsToAdd];
  }

  /**
   * Remove specific items from inventory
   * @param currentInventory - Current inventory array
   * @param itemsToRemove - Items to remove
   * @returns Updated inventory array
   */
  static removeItems(currentInventory: any[], itemsToRemove: string[]): any[] {
    const inventory = Array.isArray(currentInventory) ? [...currentInventory] : [];
    return inventory.filter(item => !itemsToRemove.includes(item));
  }

  /**
   * Check if inventory contains specific items
   * @param inventory - Inventory array
   * @param items - Items to check for
   * @returns Object with item names as keys and boolean values
   */
  static hasItems(inventory: any[], items: string[]): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    items.forEach(item => {
      result[item] = inventory.includes(item);
    });
    return result;
  }

  /**
   * Get inventory summary for display
   * @param inventory - Inventory array
   * @returns Formatted inventory string
   */
  static formatInventory(inventory: any[]): string {
    if (!Array.isArray(inventory) || inventory.length === 0) {
      return 'Empty';
    }
    
    // Count items
    const itemCounts: Record<string, number> = {};
    inventory.forEach(item => {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
    
    // Format with counts
    return Object.entries(itemCounts)
      .map(([item, count]) => count > 1 ? `${item} (${count})` : item)
      .join('\n');
  }
} 