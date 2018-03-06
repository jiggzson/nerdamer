'use strict';

var nerdamer = require('../nerdamer.core.js');

describe('The text function', function () {
    // given
    var testCases = [
       {
           given: '6',
           expected_mixed: '6',
           expected_recurring: "6"
       },
       {
           given: '-5',
           expected_mixed: '-5',
           expected_recurring: "-5"
       },
       {
           given: '1/1',
           expected_mixed: '1',
           expected_recurring: "1"
       },
       {
           given: '1/5',
           expected_mixed: '1/5',
           expected_recurring: "0.2"
       },
       {
           given: '-1/5',
           expected_mixed: '-1/5',
           expected_recurring: "-0.2"
       },
       {
           given: '1/-5',
           expected_mixed: '-1/5',
           expected_recurring: "-0.2"
       },
       {
           given: '6/5',
           expected_mixed: '1+1/5',
           expected_recurring: "1.2"
       },
       {
           given: '-6/5',
           expected_mixed: '-1-1/5',
           expected_recurring: "-1.2"
       },
       {
           given: '6/5a',
           expected_mixed: '(1+1/5)*a',
           expected_recurring: "1.2*a"
       },
       {
           given: 'a/5',
           expected_mixed: '(1/5)*a',
           expected_recurring: "0.2*a"
       },
       {
           given: '1/a',
           expected_mixed: 'a^(-1)',
           expected_recurring: "a^(-1)"
       },
       {
           given: '(2x)/(3y)',
           expected_mixed: '(2/3)*x*y^(-1)',
           expected_recurring: "(0.'6')*x*y^(-1)"
       },
       {
           given: '(3x)/(2y)',
           expected_mixed: '(1+1/2)*x*y^(-1)',
           expected_recurring: "1.5*x*y^(-1)"
       },
       {
           given: '(2x)/(-3y)',
           expected_mixed: '(-2/3)*x*y^(-1)',
           expected_recurring: "(-0.'6')*x*y^(-1)"
       },
       {
           given: '(3x)/(-2y)',
           expected_mixed: '(-1-1/2)*x*y^(-1)',
           expected_recurring: "-1.5*x*y^(-1)"
       },
       {
           given: '(10/-8)a^(-9/6)',
           expected_mixed: '(-1-1/4)*a^(-1-1/2)',
           expected_recurring: "-1.25*a^(-1.5)"
       },
       {
           given: '1/2+3/4',
           expected_mixed: '1+1/4',
           expected_recurring: "1.25"
       },
       {
           given: '2/3+4/7',
           expected_mixed: '1+5/21',
           expected_recurring: "1.'238095'"
       },
       {
           given: '100-46/47-98/43-67/44',
           expected_mixed: '95+19517/88924',
           expected_recurring: "95.21'947955557554765867482344473932796545364580990508749044127569610004048400881651747559713913004363276505780216814358328460258198011785344788808420673833835634924204939049075615132022850973865323197337051864513517160721515001574378120642346273222077279474607530025639872250461067878188115694300751203274706490936080248301920741307183662453330934280959021186631280644145562502811389501147046916467995141918942017902928343304394764068193063739822770005847690162385857586253429895191399397238090954073141109261841572578831361612163195537762583779407134181998110746255229184472133507264630470963969232153299446718546174261166839098556070352210876703702037695110431379605056002878862849174576042463227025324996626332598623543700238405829697269578516485988034726283118168323512212675992982771805136970896495884125770320723314290855112230668885790112905402366065404165354684899464711438981602267104493724978633439791282443434843236921416040663937744590886599793081732715577346'"
       },
       {
           given: '1+2-2/3+3/4-4/5+5/6-6/7+7/8-8/9+9/10-10/11',
           expected_mixed: '2+6557/27720',
           expected_recurring: "2.236'544011'"
       },
       {
           given: '20*30/46',
           expected_mixed: '13+1/23',
           expected_recurring: "13.0'4347826086956521739130'"
       }
    ];
    
    it('should give mixed fractions correctly', function () {
        for (var i = 0; i < testCases.length; ++i) {
            // when
            var text = nerdamer(testCases[i].given).text('mixed');
            // then
            expect(text).toEqual(testCases[i].expected_mixed);
        }
    });
    
    it('should give recurring decimals correctly', function () {
        for (var i = 0; i < testCases.length; ++i) {
            // when
            var text = nerdamer(testCases[i].given).text('recurring');
            // then
            expect(text).toEqual(testCases[i].expected_recurring);
        }
    });
});
