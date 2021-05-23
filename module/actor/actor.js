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

    const actorData = this.data;

    // Prepare items.
    if (actorData.type == 'character') {
      this._prepareCharacterHealth(actorData, true);
    }
    if (actorData.type == 'creature') {
      this._prepareCharacterHealth(actorData, false);
    }
  }

  /**
   * Update health stats.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterHealth(actorData, withRaces = false) {

    const caracts = actorData.data.caracts;
    const safe = actorData.data.healthLevels.safe;
    const injured = actorData.data.healthLevels.injured;
    const seriously = actorData.data.healthLevels.seriously;
    const underdeath = actorData.data.healthLevels.underdeath;

    // Assign and return
    safe.max = 2;
    injured.max = 2;
    seriously.max = 2;
    underdeath.max = 2;

    if (withRaces) {
      const race = actorData.data.attributes.race;
      const races = actorData.data.races;

      if (race === races[1].code
        || race === races[4].code) {
        seriously.max = 1;
      }
      if (race === races[2].code
        || race === races[5].code) {
        seriously.max = 3;
      }
    }

    if (caracts.vig.value === 1) {
      safe.max = 1;
    } else if (caracts.vig.value === 5) {
      safe.max = 3;
    }

    actorData.data.health.max = safe.max + injured.max + seriously.max + underdeath.max;
  }
}