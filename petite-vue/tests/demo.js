/*
 * @Author: zc
 * @Date: 2024-03-01 15:25:23
 * @LastEditors: zc
 * @LastEditTime: 2024-06-11 10:44:53
 * @FilePath: /core-main/Users/limo/github/source-code-collection/petite-vue/tests/demo.js
 */
/*
 * @Author: zc
 * @Date: 2022-07-21 22:58:02
 * @LastEditors: zc
 * @LastEditTime: 2024-03-01 15:27:05
 * @FilePath: /petite-vue-main/tests/demo.js
 */
import { createApp, reactive } from '../src';
// import * as _ from 'lodash'
import { pvButton, pvDialog } from 'https://unpkg.com/petite-vue-ui'
// import { requestUsers } from '../../utils/request'

const pvButtonConfig = {
    slot: 'Love from pv-ui',
    type: 'success',
    border: 'round',
    icon: 'pv-icon-like',
    click: 'visible.dialogShow'
  }

  console.log(pvButtonConfig?.border)

  const visible = reactive({
    value: false,
    dialogShow() {
      this.value = true
    }
  })

  const pvDialogConfig = {
    visible: 'visible.value',
    bodySlot: 'Hello petite-vue-ui',
    close: 'handleClose'
  }


  const handleClose = () => {
    console.log('Dialog is closed')
  }



// import { TestHooks } from '@/hooks/useHeader';

// import './styles/main.scss';

// TestHooks();

// console.log('lodash: ', _.lastIndexOf([1, 2, 1, 2], 2))

const Counter = initialCount => ({
    $template: `#counter`,
    count: initialCount || 0,
    handleAdd() {
      this.count += 1
    }
})

const App = {
    $template: `
        {{ index }}
        <div v-text="pageName" class="a" :class="pageName" :data="pageName"></div>
        
        <button v-if="bool" @click="pingFunc" @vue:mounted="onMounted($el)" @vue:unmounted="console.log('unmounted: ', $el)">Ping</button>


        <button @click="bool=!bool">Ping开关</button>  
        <div v-scope="Counter(1)"  ></div>
        <span v-scope="pvButton(pvButtonConfig)"></span>
        <div v-scope="pvDialog(pvDialogConfig)"></div>
    `,
    bool: true,
    index: 0,
    pageName: 'index',
    pingFunc() {
        console.log(`pong ${this.pageName} page`);
        // TestHooks();
        this.index++
    },
    onMounted($el){
        console.log('mounted on: ', $el)
        // requestUsers()
    }
}

createApp({
    pvButton,
    pvButtonConfig,
    pvButtonClick() {
        console.log(`Love from pv-ui  :\)`)
    },

    pvDialog,
    pvDialogConfig,
    handleClose,
    visible,


    App,
    Counter,
    
 

}).mount('[v-scope]');
