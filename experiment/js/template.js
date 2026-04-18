var trial_counter = 0;

function build_trials() {
  // For each critical item, randomly pick one condition
  var critical_trials = critical_items.map(function(item) {
    var sampled = _.sample(item.conditions);
    return Object.assign({}, sampled, { type: "critical" });
  });

  var practice_conditions = ["PRACTICE1", "PRACTICE2", "PRACTICE3"];
  var exp_fillers = fillers.filter(function(f) { return practice_conditions.indexOf(f.condition) === -1; });

  // Among PROVO fillers, randomly pick 8 to show comprehension questions
  var provo_fillers = exp_fillers.filter(function(f) { return f.condition === "PROVO"; });
  var provo_with_q  = provo_fillers.filter(function(f) { return f.question && f.question !== ""; });
  var sampled_q_ids = _.sample(provo_with_q, 8).map(function(f) { return f.trial_id; });

  var tagged_fillers = exp_fillers.map(function(f) {
    var has_q = f.condition === "PROVO" && sampled_q_ids.indexOf(f.trial_id) !== -1;
    return Object.assign({}, f, { has_question: has_q });
  });

  // Combine with fillers and shuffle
  return _.shuffle(critical_trials.concat(tagged_fillers));
}

function make_slides(f) {
  var   slides = {};

  slides.welcome = slide({
     name : "welcome",
     start: function() {
      exp.startT = Date.now();
     }
  });

  slides.instructions = slide({
    name : "instructions",
    button : function() {
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });


  slides.trial = slide({
    name: "trial",
    present: exp.train_stims,
    present_handle: function(stim) {
      this.stim = stim;
      this.position = 0;

      $("#trial-instruction, #stimulus-sentence").show();
      $("#comprehension-question").hide();
      $("#trial-iti").hide();

      var t = this;
      t.show_iti = function() {
        $("#trial-instruction, #stimulus-sentence, #comprehension-question").hide();
        $("#trial-iti").show();
        $(document).unbind("keydown");
        $(document).bind("keydown", function(evt) {
          if (evt.keyCode == 32 && !evt.originalEvent.repeat) {
            evt.preventDefault();
            $(document).unbind("keydown");
            $("#trial-iti").hide();
            $("#trial-instruction, #stimulus-sentence").show();
            _stream.apply(t);
          }
        });
      };

      var html = "";

      for (var i = 0; i < stim.words.length; i++) {
        var word = stim.words[i];
        var masked_word = word.form.replace(/./g, "-") + " ";
        var word_ch = word.form.length + 1;
        html += "<span style=\"display:inline-block;width:" + word_ch + "ch\" data-form=\"" + word.form + " \" data-masked-form=\"" + masked_word + "\" id=\"stimulus-word-" + i + "\">" + masked_word + "</span>"
      }

      this.response_times = [];

      $("#stimulus-sentence").html(html);

      $(document).bind("keydown", function(evt) {
        if (evt.keyCode == 32 && !evt.originalEvent.repeat) {
          evt.preventDefault();
          t.response_times.push(Date.now());
          if (t.position > 0) {
            var prev_idx = t.position - 1;
            $("#stimulus-word-" + prev_idx).text($("#stimulus-word-" + prev_idx).data("masked-form"));
          }
          if (t.position < t.stim.words.length) {
            $("#stimulus-word-" + t.position).text($("#stimulus-word-" + t.position).data("form"));
            t.position++;
          } else {
            $(document).unbind("keydown");
            if (t.stim.has_question) {
              $("#comprehension-question").show();
            } else {
              t.response_correct = null;
              t.log_responses();
              t.show_iti();
            }
          }
        }

      });
      
      $("#comprehension-question-q").text(stim.question);
      var answers = _.shuffle([stim.correct_answer, stim.incorrect_answer]);
      $("#test-response-1").val(answers[0]);
      $("#test-response-2").val(answers[1]);
      
      
      
     
     
     

    },
    button : function(response) {
      this.response_correct = response == this.stim.correct_answer;
      this.log_responses();
      this.show_iti();
    },

    log_responses : function() {
      for (var i = 0; i < this.stim.words.length; i++) {
        var word = this.stim.words[i];
        exp.data_trials.push({
          "trial_id": this.stim.trial_id,
          "word_idx": i,
          "form": word.form,
          "region": word.region,
          "lbr_before": word.lbr_before ? 1 : 0,
          "lbr_after": word.lbr_after ? 1 : 0,
          "rt": this.response_times[i+1] - this.response_times[i],
          "type": this.stim.type,
          "response_correct": this.response_correct === null ? "NA" : (this.response_correct ? 1 : 0),
          "trial_no": trial_counter
        }); 
      }
      trial_counter++;
    }
  });

  


  slides["practice-start"] = slide({ name: "practice-start" });

  slides.practice = slide({
    name: "practice",
    present: exp.practice_stims,
    present_handle: function(stim) {
      this.stim = stim;
      this.position = 0;

      var t = this;

      $("#practice-reading").show();
      $("#practice-comprehension-question").hide();
      $("#practice-feedback").hide();
      $("#practice-iti").hide();

      t.show_iti = function() {
        $("#practice-reading").hide();
        $("#practice-comprehension-question").hide();
        $("#practice-feedback").hide();
        $("#practice-iti").show();
        $(document).off("keydown.practice").on("keydown.practice", function(evt) {
          if (evt.keyCode == 32 && !evt.originalEvent.repeat) {
            evt.preventDefault();
            $(document).off("keydown.practice");
            $("#practice-iti").hide();
            _stream.apply(t);
          }
        });
      };

      var html = "";
      for (var i = 0; i < stim.words.length; i++) {
        var word = stim.words[i];
        var masked_word = word.form.replace(/./g, "-") + " ";
        var word_ch = word.form.length + 1;
        html += "<span style=\"display:inline-block;width:" + word_ch + "ch\" data-form=\"" + word.form + " \" data-masked-form=\"" + masked_word + "\" id=\"practice-word-" + i + "\">" + masked_word + "</span>";
      }
      $("#practice-stimulus-sentence").html(html);

      $(document).off("keydown.practice").on("keydown.practice", function(evt) {
        if (evt.keyCode == 32 && !evt.originalEvent.repeat) {
          evt.preventDefault();
          if (t.position > 0) {
            var prev_idx = t.position - 1;
            $("#practice-word-" + prev_idx).text($("#practice-word-" + prev_idx).data("masked-form"));
          }
          if (t.position < t.stim.words.length) {
            $("#practice-word-" + t.position).text($("#practice-word-" + t.position).data("form"));
            t.position++;
          } else {
            $(document).off("keydown.practice");
            if (t.stim.question && t.stim.question !== "") {
              $("#practice-question-q").text(t.stim.question);
              var answers = _.shuffle([t.stim.correct_answer, t.stim.incorrect_answer]);
              $("#practice-response-1").val(answers[0]);
              $("#practice-response-2").val(answers[1]);
              $("#practice-comprehension-question").show();
            } else {
              t.show_iti();
            }
          }
        }
      });

      $("#practice-response-1, #practice-response-2").off("click.practice").on("click.practice", function() {
        var response = $(this).val();
        var correct = response === t.stim.correct_answer;
        exp.catch_trials.push({
          "trial_id": t.stim.trial_id,
          "condition": t.stim.condition,
          "question": t.stim.question,
          "response": response,
          "correct_answer": t.stim.correct_answer,
          "response_correct": correct ? 1 : 0
        });
        $("#practice-reading").hide();
        $("#practice-comprehension-question").hide();
        var msg = correct
          ? "Nice job! Your answer was correct."
          : "Your answer was incorrect. Please read the sentences more carefully!";
        $("#practice-feedback-text").text(msg).css("color", correct ? "green" : "red");
        $("#practice-feedback").show();
        $("#practice-feedback-continue").off("click.practice-cont").on("click.practice-cont", function() {
          t.show_iti();
        });
      });
    }
  });

  slides["practice-end"] = slide({ name: "practice-end" });

  slides.subj_info =  slide({
    name : "subj_info",
    submit : function(e){
      //if (e.preventDefault) e.preventDefault(); // I don't know what this means.
      exp.subj_data = {
        language : $("#language").val(),
        name : $("#name").val(),
        gender : $('#gender').val(),
        tirednesslvl : $('#tirednesslvl').val(),
        age : $("#age").val()
      };
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });

  slides.thanks = slide({
    name : "thanks",
    start : function() {
      exp.data= {
          "trials" : exp.data_trials,
          "catch_trials" : exp.catch_trials,
          "system" : exp.system,
          "condition" : exp.condition,
          "subject_information" : exp.subj_data,
          "time_in_minutes" : (Date.now() - exp.startT)/60000
      };
      proliferate.submit(exp.data);
    }
  });

  return slides;
}

/// init ///
function init() {
  // exp.condition = condition;
  exp.trials = [];
  exp.catch_trials = [];
  exp.practice_stims = fillers
    .filter(function(f) { return ["PRACTICE1", "PRACTICE2", "PRACTICE3"].indexOf(f.condition) !== -1; })
    .sort(function(a, b) { return a.condition < b.condition ? -1 : 1; });
  exp.train_stims = build_trials(); //can randomize between subject conditions here
  exp.system = {
      Browser : BrowserDetect.browser,
      OS : BrowserDetect.OS,
      screenH: screen.height,
      screenUH: exp.height,
      screenW: screen.width,
      screenUW: exp.width
    };
  //blocks of the experiment:
  exp.structure=["welcome", "instructions", "practice-start", "practice", "practice-end", "trial", "subj_info", "thanks"];

  exp.data_trials = [];
  //make corresponding slides:
  exp.slides = make_slides(exp);

  exp.nQs = utils.get_exp_length(); //this does not work if there are stacks of stims (but does work for an experiment with this structure)
                    //relies on structure and slides being defined

  $('.slide').hide(); //hide everything

  //make sure turkers have accepted HIT (or you're not in mturk)
  $("#start_button").click(function() {
    if (turk.previewMode) {
      $("#mustaccept").show();
    } else {
      $("#start_button").click(function() {$("#mustaccept").show();});
      exp.go();
    }
  });

  $(".response-buttons, .test-response-buttons").click(function() {
    _s.button($(this).val());
  });

  exp.go(); //show first slide
}
