'use strict';

var inherits = require('inherits');

var RuleProvider = require('diagram-js/lib/features/rules/RuleProvider');
var is = require('bpmn-js/lib/util/ModelUtil').is;
var isAny = require('bpmn-js/lib/features/modeling/util/ModelingUtil').isAny;

/**
 * A custom rule provider that decides what elements can be
 * dropped where based on a `vendor:allowDrop` BPMN extension.
 *
 * See {@link BpmnRules} for the default implementation
 * of BPMN 2.0 modeling rules provided by bpmn-js.
 *
 * @param {EventBus} eventBus
 */
function CPRules(eventBus) {
    RuleProvider.call(this, eventBus);
}

inherits(CPRules, RuleProvider);

CPRules.$inject = [ 'eventBus' ];

module.exports = CPRules;


CPRules.prototype.init = function() {

    function canDecisionLogicConnect(source, target) {
        // only judge about custom elements
        if (isAny(source, ['cp:DecisionLogic', 'cp:EvidenceGateway']) && isAny(target, ['cp:DecisionLogic', 'cp:EvidenceGateway']) && (source.type != target.type)) {
            return {type: 'cp:Connection'};
        } else {
            return;
        }
    }

    function canInsertElement(context) {
        var shape = context.shape,
            target = context.target;

        // only check conditions if CP-Element
        if (!isCP(shape)) {
            return;
        }

        // we check for a custom vendor:allowDrop attribute
        // to be present on the BPMN 2.0 xml of the target
        // node
        //
        // we could practically check for other things too,
        // such as incoming / outgoing connections, element
        // types, ...
        var shapeBo = shape.businessObject,
            targetBo = target.businessObject;

        return isAny(target, ['bpmn:Process', 'bpmn:Participant', 'bpmn:Collaboration']);

        // not returning anything means other rule
        // providers can still do their work
        //
        // this allows us to reuse the existing BPMN rules
    }

    // there exist a number of modeling actions
    // that are identified by a unique ID. We
    // can hook into each one of them and make sure
    // they are only allowed if we say so
    this.addRule('shape.create', function(context) {
        return canInsertElement(context);
    });

    this.addRule('elements.move', function(context) {
        return true;
    });

    this.addRule('connection.create', function(context) {
        var source = context.source,
            target = context.target;

        return canDecisionLogicConnect(source, target);
    });

    this.addRule('connection.reconnectStart', function(context) {
        var connection = context.connection,
            source = context.hover || context.source,
            target = connection.target;

        return canDecisionLogicConnect(source, target, connection);
    });

    this.addRule('connection.reconnectEnd', function(context) {
        var connection = context.connection,
            source = connection.source,
            target = context.hover || context.target;

        return canDecisionLogicConnect(source, target, connection);
    });
};

function isCP(element) {
    return element && /^cp\:/.test(element.type);
}