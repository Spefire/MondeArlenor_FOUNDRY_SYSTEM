import difficulties from "./../../models/divinities.json" assert { type: "json" };
import equipmentTypes from "./../../models/equipmentTypes.json" assert { type: "json" };
import durations from "./../../models/durations.json" assert { type: "json" };
import families from "./../../models/families.json" assert { type: "json" };
import itemTypes from "./../../models/itemTypes.json" assert { type: "json" };
import powerTypes from "./../../models/powerTypes.json" assert { type: "json" };
import ranges from "./../../models/ranges.json" assert { type: "json" };
import ranks from "./../../models/ranks.json" assert { type: "json" };
import skillTypes from "./../../models/skillTypes.json" assert { type: "json" };
import specialities from "./../../models/specialities.json" assert { type: "json" };

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class ArlenorItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["arlenor", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "properties" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/arlenor/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.hbs`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.hbs`.
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const baseData = super.getData();

    const enrichedBiography = await TextEditor.enrichHTML(this.item.system.description, { async: true });

    // Return data for the "item-sheet.hbs"
    let sheetData = {
      editable: this.isEditable,
      item: this.item,
      system: this.item.system,
      enrichedBiography,
      difficulties,
      durations,
      equipmentTypes,
      families,
      itemTypes,
      powerTypes,
      ranges,
      ranks,
      skillTypes,
      specialities
    };

    return sheetData;
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;
  }
}
