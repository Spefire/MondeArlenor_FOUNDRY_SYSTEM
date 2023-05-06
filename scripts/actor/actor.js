import races from "./../../models/races.json" assert { type: "json" };

/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class ArlenorActor extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Prepare items
    if (this.type == 'character') {
      this._prepareCharacterHealth(this, true);
    }
    if (this.type == 'creature') {
      this._prepareCharacterHealth(this, false);
    }
  }

  /**
   * Update health stats.
   *
   * @param {Object} actor The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterHealth(actor, withRaces = false) {
    const data = actor.system;

    const caracts = data.caracts;
    const safe = data.healthLevels.safe;
    const injured = data.healthLevels.injured;
    const underdeath = data.healthLevels.underdeath;

    data.health.max = 5 + Math.floor(data.level / 2);

    if (withRaces) {
      const race = data.race;
      if (race === races[1].code
        || race === races[4].code) {
        data.health.max += 1;
      }
    }

    if (caracts.ten.value === 0) {
      data.health.max -= 1;
    } else if (caracts.ten.value > 2) {
      data.health.max += 1;
    }

    safe.max = Math.round(data.health.max * 40 / 100);
    injured.max = Math.floor(data.health.max * 40 / 100);
    underdeath.max = data.health.max - safe.max - injured.max;
  }
}