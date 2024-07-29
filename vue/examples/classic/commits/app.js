/*
 * @Author: zc
 * @Date: 2023-07-24 15:45:36
 * @LastEditors: zc
 * @LastEditTime: 2023-08-01 15:02:10
 * @FilePath: /vue/examples/classic/commits/app.js
 */
var apiURL = 'https://api.github.com/repos/vuejs/vue/commits?per_page=3&sha='
var Child = {
  template: "<div>Child</div>"
}
/**
 * Actual demo
 */

new Vue({
  components: {
    Child
  },
  // inject: ['foo'],
  el: '#demo',
  directives: {
    focus() {
      console.log(1)
    }
  },
  data(){
    return {
      branches: ['main', 'dev'],
      currentBranch: 'main',
      commits: null
    }
  },

  mounted: function () {
    // this.fetchData()

    // this.branches[0] = 111
    // this.$set(this.branches, 0, 112)
    // this.branches.length = 0
    // this.$delete(this.branches, 'length')
  },

  watch: {
    currentBranch: 'fetchData',
    branches: 'watchBranches'
  },

  filters: {
    truncate: function (v) {
      var newline = v.indexOf('\n')
      return newline > 0 ? v.slice(0, newline) : v
    },
    formatDate: function (v) {
      return v.replace(/T|Z/g, ' ')
    }
  },

  methods: {
    fetchData: function () {
      var self = this
      var xhr = new XMLHttpRequest()
      xhr.open('GET', apiURL + self.currentBranch)
      xhr.onload = function () {
        self.commits = JSON.parse(xhr.responseText)
        console.log(self.commits[0].html_url)
      }
      xhr.send()
    },
    watchBranches(val, oldVal){
      debugger
    }
  }
})
